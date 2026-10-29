import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, ConflictException } from "@nestjs/common";
import { AssembliesService } from "./assemblies.service";
import { PrismaService } from "../../database/prisma.service";
import { AssemblyStatus, MembershipStatus, AssemblyType } from "@conectajac/shared";
import * as crypto from "crypto";

describe("AssembliesService", () => {
  let service: AssembliesService;

  const mockPrisma = {
    jac: {
      findUnique: jest.fn(),
    },
    jacMembership: {
      count: jest.fn(),
      findFirst: jest.fn(),
    },
    assembly: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    assemblyTopic: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    assemblyVoteRecord: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssembliesService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<AssembliesService>(AssembliesService);
  });

  describe("createAssembly", () => {
    it("debe calcular correctamente el quórum reglamentario requerido (50%)", async () => {
      mockPrisma.jac.findUnique.mockResolvedValue({ id: "jac-1", isActive: true });
      mockPrisma.jacMembership.count.mockResolvedValue(100); // 100 afiliados activos

      mockPrisma.assembly.create.mockResolvedValue({
        id: "asm-1",
        jacId: "jac-1",
        title: "Asamblea Ordinaria 2026",
        quorumPercentageRequired: 50,
        status: AssemblyStatus.SCHEDULED,
      });

      const result = await service.createAssembly({
        jacId: "jac-1",
        title: "Asamblea Ordinaria 2026",
        type: AssemblyType.ORDINARY,
        scheduledDate: "2026-05-10T14:00:00Z",
        location: "Casa Comunal",
        quorumPercentageRequired: 50,
      });

      expect(result.quorumSummary.totalActiveAffiliates).toBe(100);
      expect(result.quorumSummary.requiredQuorumCount).toBe(50);
    });
  });

  describe("castVote", () => {
    const mockTopic = {
      id: "topic-1",
      assemblyId: "asm-1",
      jacId: "jac-1",
      assembly: {
        status: AssemblyStatus.IN_PROGRESS,
      },
      isOpen: true,
      options: [
        { id: "SI", label: "A Favor" },
        { id: "NO", label: "En Contra" },
      ],
    };

    it("debe rechazar el voto si la asamblea no se encuentra IN_PROGRESS", async () => {
      mockPrisma.assemblyTopic.findUnique.mockResolvedValue({
        ...mockTopic,
        assembly: { status: AssemblyStatus.SCHEDULED },
      });

      await expect(
        service.castVote("user-1", {
          assemblyId: "asm-1",
          topicId: "topic-1",
          selectedOptionId: "SI",
          voteSignature: "sig-test-1",
        })
      ).rejects.toThrow(BadRequestException);
    });

    it("debe rechazar el voto si el usuario no es afiliado activo", async () => {
      mockPrisma.assemblyTopic.findUnique.mockResolvedValue(mockTopic);
      mockPrisma.jacMembership.findFirst.mockResolvedValue(null);

      await expect(
        service.castVote("user-1", {
          assemblyId: "asm-1",
          topicId: "topic-1",
          selectedOptionId: "SI",
          voteSignature: "sig-test-1",
        })
      ).rejects.toThrow(/Solo los afiliados activos/);
    });

    it("debe prevenir doble votación lanzando ConflictException", async () => {
      mockPrisma.assemblyTopic.findUnique.mockResolvedValue(mockTopic);
      mockPrisma.jacMembership.findFirst.mockResolvedValue({
        id: "mem-1",
        status: MembershipStatus.ACTIVE,
      });
      mockPrisma.assemblyVoteRecord.findFirst.mockResolvedValue({
        id: "existing-vote",
      });

      await expect(
        service.castVote("user-1", {
          assemblyId: "asm-1",
          topicId: "topic-1",
          selectedOptionId: "SI",
          voteSignature: "sig-test-1",
        })
      ).rejects.toThrow(ConflictException);
    });

    it("debe cifrar el voto con AES-256 y emitir recibo hash", async () => {
      mockPrisma.assemblyTopic.findUnique.mockResolvedValue(mockTopic);
      mockPrisma.jacMembership.findFirst.mockResolvedValue({
        id: "mem-1",
        status: MembershipStatus.ACTIVE,
      });
      mockPrisma.assemblyVoteRecord.findFirst.mockResolvedValue(null); // No ha votado aún
      mockPrisma.assemblyVoteRecord.create.mockResolvedValue({ id: "vote-1" });

      const res = await service.castVote("user-1", {
        assemblyId: "asm-1",
        topicId: "topic-1",
        selectedOptionId: "SI",
        voteSignature: "sig-test-1",
      });

      expect(res.message).toBe("Voto registrado con éxito");
      expect(res.receiptHash).toBeDefined();
      expect(mockPrisma.assemblyVoteRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            topicId: "topic-1",
            voterUserId: "user-1",
            encryptedPayload: expect.any(String),
          }),
        })
      );
    });
  });

  describe("closeTopicAndTally", () => {
    it("debe descifrar las papeletas en memoria y realizar el escrutinio exacto", async () => {
      const voteSecret = "conectajac-secret-vote-integrity-key-2026";
      const key = crypto.createHash("sha256").update(voteSecret).digest();

      // Cifrar 2 votos por "SI" y 1 por "NO"
      const encrypt = (opt: string) => {
        const cipher = crypto.createCipheriv("aes-256-cbc", key, Buffer.alloc(16, 0));
        let enc = cipher.update(JSON.stringify({ optionId: opt }), "utf8", "hex");
        enc += cipher.final("hex");
        return enc;
      };

      const votes = [
        { id: "v1", encryptedPayload: encrypt("SI") },
        { id: "v2", encryptedPayload: encrypt("SI") },
        { id: "v3", encryptedPayload: encrypt("NO") },
      ];

      mockPrisma.assemblyTopic.findFirst.mockResolvedValue({
        id: "topic-1",
        jacId: "jac-1",
        options: [
          { id: "SI", label: "A Favor" },
          { id: "NO", label: "En Contra" },
        ],
        votes,
      });

      mockPrisma.assemblyTopic.update.mockResolvedValue({ id: "topic-1", isOpen: false });

      const tallyResult = await service.closeTopicAndTally("topic-1", "jac-1");

      expect(tallyResult.totalVotes).toBe(3);
      const siOpt = tallyResult.results.find((r) => r.id === "SI");
      const noOpt = tallyResult.results.find((r) => r.id === "NO");

      expect(siOpt?.votes).toBe(2);
      expect(noOpt?.votes).toBe(1);
    });
  });
});
