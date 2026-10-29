import {
  PrismaClient,
  UserRole,
  IdentificationType,
  MembershipStatus,
  FeeType,
  FeePeriodicity,
  ObligationStatus,
  TreasuryAccountType,
  TreasuryTransactionType,
  TreasuryCategory,
  MarketUnit,
  DeliveryMethod,
  PostScope,
  PostType,
  PostPriority,
  PqrsdType,
  PqrsdStatus,
  AssemblyType,
  AssemblyStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

// Hash bcrypt de 'Password123!' (cost 10)
const DEFAULT_PASSWORD_HASH =
  "$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW";

async function main() {
  console.log("🌱 Iniciando siembra de datos para ConectaJAC (Colombia)...");

  // 1. MUNICIPIOS
  console.log("📍 Registrando Municipios...");
  const sanVicente = await prisma.municipality.upsert({
    where: { daneCode: "68689" },
    update: {},
    create: {
      name: "San Vicente de Chucurí",
      department: "Santander",
      daneCode: "68689",
    },
  });

  const zapatoca = await prisma.municipality.upsert({
    where: { daneCode: "68895" },
    update: {},
    create: {
      name: "Zapatoca",
      department: "Santander",
      daneCode: "68895",
    },
  });

  // 2. ASOJUNTAS
  console.log("🏛️ Registrando Asojuntas...");
  const asojuntasSanVicente = await prisma.asojuntas.upsert({
    where: { nit: "900555123-1" },
    update: {},
    create: {
      municipalityId: sanVicente.id,
      name: "Asociación de Juntas de Acción Comunal de San Vicente de Chucurí",
      nit: "900555123-1",
      legalPersonhoodNumber: "PJ-ASO-68689-01",
      email: "contacto@asojuntassanvicente.org",
      phone: "+573105550001",
      address: "Carrera 11 # 10-25, Palacio Municipal, Piso 2",
      isActive: true,
    },
  });

  // 3. JUNTAS DE ACCIÓN COMUNAL (JACs)
  console.log("🏡 Registrando Juntas de Acción Comunal (JAC)...");
  const jacElSalado = await prisma.jac.upsert({
    where: { nit: "900888777-1" },
    update: {},
    create: {
      municipalityId: sanVicente.id,
      asojuntasId: asojuntasSanVicente.id,
      name: "Junta de Acción Comunal Vereda El Salado",
      legalPersonhoodNumber: "PJ-0492-ST",
      nit: "900888777-1",
      codeRup: "RUP-68689-001",
      veredaOrBarrio: "El Salado",
      address: "Sede Comunal Frente a la Cancha Múltiple",
      phone: "+573124440001",
      email: "jac.elsalado@conectajac.org",
      primaryColor: "#059669",
      bankAccounts: [
        {
          bankName: "Banco Agrario de Colombia",
          accountType: "Ahorros",
          accountNumber: "0492-8877-01",
          holderName: "Junta de Acción Comunal Vereda El Salado",
          holderNit: "900888777-1",
        },
        {
          bankName: "Daviplata Comunal",
          accountType: "Billetera Digital",
          accountNumber: "3124440001",
          holderName: "Tesorero JAC El Salado",
          holderNit: "900888777-1",
        },
      ],
      isActive: true,
    },
  });

  const jacCantarranas = await prisma.jac.upsert({
    where: { nit: "900888777-2" },
    update: {},
    create: {
      municipalityId: sanVicente.id,
      asojuntasId: asojuntasSanVicente.id,
      name: "Junta de Acción Comunal Vereda Cantarranas",
      legalPersonhoodNumber: "PJ-0518-ST",
      nit: "900888777-2",
      codeRup: "RUP-68689-002",
      veredaOrBarrio: "Cantarranas",
      address: "Sector La Escuela, Casa Comunal",
      phone: "+573145550002",
      email: "jac.cantarranas@conectajac.org",
      primaryColor: "#1d4ed8",
      bankAccounts: [
        {
          bankName: "Banco Agrario de Colombia",
          accountType: "Ahorros",
          accountNumber: "0518-9988-02",
          holderName: "JAC Cantarranas",
          holderNit: "900888777-2",
        },
      ],
      isActive: true,
    },
  });

  // 4. USUARIOS DIRECTIVOS Y AFILIADOS
  console.log("👥 Registrando Usuarios y Directivos...");

  // Super Admin Asojuntas
  const superAdmin = await prisma.user.upsert({
    where: { identificationNumber: "1098000001" },
    update: {},
    create: {
      identificationType: IdentificationType.CC,
      identificationNumber: "1098000001",
      firstName: "Álvaro",
      lastName: "García Parra",
      email: "admin@asojuntas.org",
      phone: "+573105550001",
      passwordHash: DEFAULT_PASSWORD_HASH,
      isActive: true,
      isEmailVerified: true,
      isPhoneVerified: true,
    },
  });

  // Presidente JAC El Salado
  const presidenteSalado = await prisma.user.upsert({
    where: { identificationNumber: "1098777001" },
    update: {},
    create: {
      identificationType: IdentificationType.CC,
      identificationNumber: "1098777001",
      firstName: "Pedro",
      lastName: "Gómez Rueda",
      email: "presidente.salado@conectajac.org",
      phone: "+573124440001",
      passwordHash: DEFAULT_PASSWORD_HASH,
      isActive: true,
      isEmailVerified: true,
    },
  });

  // Secretaria JAC El Salado (Custodia del Libro de Afiliados)
  const secretariaSalado = await prisma.user.upsert({
    where: { identificationNumber: "1098777002" },
    update: {},
    create: {
      identificationType: IdentificationType.CC,
      identificationNumber: "1098777002",
      firstName: "María",
      lastName: "Rodríguez Silva",
      email: "secretaria.salado@conectajac.org",
      phone: "+573124440002",
      passwordHash: DEFAULT_PASSWORD_HASH,
      isActive: true,
      isEmailVerified: true,
    },
  });

  // Tesorero JAC El Salado
  const tesoreroSalado = await prisma.user.upsert({
    where: { identificationNumber: "1098777003" },
    update: {},
    create: {
      identificationType: IdentificationType.CC,
      identificationNumber: "1098777003",
      firstName: "Carlos",
      lastName: "Duarte Flórez",
      email: "tesorero.salado@conectajac.org",
      phone: "+573124440003",
      passwordHash: DEFAULT_PASSWORD_HASH,
      isActive: true,
      isEmailVerified: true,
    },
  });

  // Campesino Productor Afiliado
  const campesinoJorge = await prisma.user.upsert({
    where: { identificationNumber: "1098777004" },
    update: {},
    create: {
      identificationType: IdentificationType.CC,
      identificationNumber: "1098777004",
      firstName: "Jorge",
      lastName: "Valenzuela Castro",
      email: "campesino.salado@conectajac.org",
      phone: "+573124440004",
      passwordHash: DEFAULT_PASSWORD_HASH,
      isActive: true,
      isEmailVerified: true,
    },
  });

  // Ciudadana Afiliada
  const habitanteRosa = await prisma.user.upsert({
    where: { identificationNumber: "1098777005" },
    update: {},
    create: {
      identificationType: IdentificationType.CC,
      identificationNumber: "1098777005",
      firstName: "Rosa Helena",
      lastName: "Mendoza Ortiz",
      email: "ciudadana.salado@conectajac.org",
      phone: "+573124440005",
      passwordHash: DEFAULT_PASSWORD_HASH,
      isActive: true,
      isEmailVerified: true,
    },
  });

  // 5. LIBRO DIGITAL DE AFILIADOS (Ley 2166 de 2021)
  console.log("📖 Asentando Libro Digital de Afiliados...");

  // Folio #1: Presidente
  await prisma.jacMembership.upsert({
    where: {
      jacId_userId: { jacId: jacElSalado.id, userId: presidenteSalado.id },
    },
    update: {},
    create: {
      jacId: jacElSalado.id,
      userId: presidenteSalado.id,
      role: UserRole.JAC_PRESIDENT,
      status: MembershipStatus.ACTIVE,
      bookNumber: 1,
      folioNumber: 1,
      address: "Finca El Porvenir",
      veredaOrBarrio: "El Salado",
      occupation: "Cacaocultor",
      hasLandOrFarm: true,
      farmName: "El Porvenir",
      observations: "Presidente de la Junta - Periodo 2024-2028",
    },
  });

  // Folio #2: Secretaria
  await prisma.jacMembership.upsert({
    where: {
      jacId_userId: { jacId: jacElSalado.id, userId: secretariaSalado.id },
    },
    update: {},
    create: {
      jacId: jacElSalado.id,
      userId: secretariaSalado.id,
      role: UserRole.JAC_SECRETARY,
      status: MembershipStatus.ACTIVE,
      bookNumber: 1,
      folioNumber: 2,
      address: "Sector La Escuela",
      veredaOrBarrio: "El Salado",
      occupation: "Docente Rural",
      hasLandOrFarm: false,
      observations: "Secretaria General - Custodia del Libro de Afiliados",
    },
  });

  // Folio #3: Tesorero
  await prisma.jacMembership.upsert({
    where: {
      jacId_userId: { jacId: jacElSalado.id, userId: tesoreroSalado.id },
    },
    update: {},
    create: {
      jacId: jacElSalado.id,
      userId: tesoreroSalado.id,
      role: UserRole.JAC_TREASURER,
      status: MembershipStatus.ACTIVE,
      bookNumber: 1,
      folioNumber: 3,
      address: "Finca Los Arrayanes",
      veredaOrBarrio: "El Salado",
      occupation: "Comerciante y Ganadero",
      hasLandOrFarm: true,
      farmName: "Los Arrayanes",
      observations: "Tesorero Principal",
    },
  });

  // Folio #4: Campesino Jorge
  const membershipJorge = await prisma.jacMembership.upsert({
    where: {
      jacId_userId: { jacId: jacElSalado.id, userId: campesinoJorge.id },
    },
    update: {},
    create: {
      jacId: jacElSalado.id,
      userId: campesinoJorge.id,
      role: UserRole.CITIZEN,
      status: MembershipStatus.ACTIVE,
      bookNumber: 1,
      folioNumber: 4,
      address: "Finca Villa Nueva, Sector El Alto",
      veredaOrBarrio: "El Salado",
      occupation: "Agricultor Productor",
      hasLandOrFarm: true,
      farmName: "Villa Nueva",
      observations: "Productor agrícola certificado",
    },
  });

  // Folio #5: Habitante Rosa
  const membershipRosa = await prisma.jacMembership.upsert({
    where: {
      jacId_userId: { jacId: jacElSalado.id, userId: habitanteRosa.id },
    },
    update: {},
    create: {
      jacId: jacElSalado.id,
      userId: habitanteRosa.id,
      role: UserRole.CITIZEN,
      status: MembershipStatus.ACTIVE,
      bookNumber: 1,
      folioNumber: 5,
      address: "Finca El Recuerdo",
      veredaOrBarrio: "El Salado",
      occupation: "Artesana",
      hasLandOrFarm: false,
      observations: "Afiliada activa",
    },
  });

  // 6. TESORERÍA Y CUOTAS COMUNALES
  console.log("💰 Creando Cuentas y Libro Contable de Tesorería...");
  const cajaMenor = await prisma.treasuryAccount.create({
    data: {
      jacId: jacElSalado.id,
      name: "Caja Menor Comunal (Efectivo)",
      type: TreasuryAccountType.CASH_BOX,
      balance: 350000.0,
      accountNumber: "CAJA-001",
    },
  });

  const bancoAgrario = await prisma.treasuryAccount.create({
    data: {
      jacId: jacElSalado.id,
      name: "Banco Agrario de Colombia - Ahorros",
      type: TreasuryAccountType.BANK_SAVINGS,
      balance: 4200000.0,
      accountNumber: "0492-8877-01",
    },
  });

  // Configuración de Cuotas
  const cuotaMensual = await prisma.feeConfiguration.create({
    data: {
      jacId: jacElSalado.id,
      name: "Cuota Ordinaria Mensual de Sostenimiento",
      description: "Aporte para aseo, papelería y servicios de la Casa Comunal",
      type: FeeType.ORDINARY,
      periodicity: FeePeriodicity.MONTHLY,
      amount: 10000.0,
      dueDateDay: 15,
      isActive: true,
    },
  });

  const cuotaExtraordinaria = await prisma.feeConfiguration.create({
    data: {
      jacId: jacElSalado.id,
      name: "Aporte Extraordinario: Mantenimiento Puente Veredal",
      description: "Aprobado en Asamblea Extraordinaria para compra de tablones y pintura anticorrosiva",
      type: FeeType.EXTRAORDINARY,
      periodicity: FeePeriodicity.ONE_TIME,
      amount: 50000.0,
      dueDateDay: 30,
      isActive: true,
    },
  });

  // Obligaciones creadas para el periodo actual
  await prisma.userFeeObligation.createMany({
    data: [
      {
        jacId: jacElSalado.id,
        userId: campesinoJorge.id,
        feeConfigId: cuotaMensual.id,
        period: "2026-03",
        amount: 10000.0,
        paidAmount: 10000.0,
        status: ObligationStatus.PAID,
        dueDate: new Date("2026-03-15"),
      },
      {
        jacId: jacElSalado.id,
        userId: habitanteRosa.id,
        feeConfigId: cuotaMensual.id,
        period: "2026-03",
        amount: 10000.0,
        paidAmount: 0.0,
        status: ObligationStatus.PENDING,
        dueDate: new Date("2026-03-15"),
      },
    ],
  });

  // Registro de ingreso contable
  await prisma.treasuryTransaction.create({
    data: {
      jacId: jacElSalado.id,
      accountId: cajaMenor.id,
      registeredByUserId: tesoreroSalado.id,
      type: TreasuryTransactionType.INCOME,
      category: TreasuryCategory.MONTHLY_FEE,
      amount: 10000.0,
      balanceAfter: 350000.0,
      description: "Recaudo Cuota Ordinaria Marzo 2026 - Folio #4 (Jorge Valenzuela)",
    },
  });

  // 7. MERCADO CAMPESINO
  console.log("🌽 Creando Categorías y Cosechas del Mercado Campesino...");
  const catFrutas = await prisma.marketCategory.create({
    data: {
      name: "Frutas, Cítricos y Plátano",
      slug: "frutas-citricos-platano",
      displayOrder: 1,
    },
  });

  const catCacao = await prisma.marketCategory.create({
    data: {
      name: "Cacao y Café Especial Veredal",
      slug: "cacao-cafe-especial",
      displayOrder: 2,
    },
  });

  const catLacteos = await prisma.marketCategory.create({
    data: {
      name: "Lácteos y Derivados Campesinos",
      slug: "lacteos-derivados",
      displayOrder: 3,
    },
  });

  // Perfil del Productor
  const productorJorge = await prisma.producerProfile.create({
    data: {
      userId: campesinoJorge.id,
      jacId: jacElSalado.id,
      farmName: "Finca Villa Nueva",
      veredaName: "El Salado",
      bio: "Cacaocultor y productor tradicional chucureño. Cosechas agroecológicas libres de pesticidas.",
      whatsappContact: "+573124440004",
      isVerified: true,
      rating: 5.0,
      acceptsOnlinePayment: true,
      acceptsCashOnDelivery: true,
    },
  });

  // Productos de Don Jorge
  await prisma.marketProduct.createMany({
    data: [
      {
        producerId: productorJorge.id,
        jacId: jacElSalado.id,
        categoryId: catCacao.id,
        title: "Cacao Seco Fermentado Grano Selección",
        description: "Cacao de fino aroma y sabor, fermentación de 6 días en cajón de madera y secado solar.",
        price: 480000.0,
        unit: MarketUnit.BULTO,
        stockQuantity: 15.0,
        isOrganic: true,
        availableForDelivery: true,
        availableForPickup: true,
        isAvailable: true,
      },
      {
        producerId: productorJorge.id,
        jacId: jacElSalado.id,
        categoryId: catFrutas.id,
        title: "Plátano Hartón Verde Racimo Fresco",
        description: "Recién cortado de la mata en Finca Villa Nueva. Excelente para patacones y sancocho.",
        price: 32000.0,
        unit: MarketUnit.ARROBA,
        stockQuantity: 30.0,
        isOrganic: true,
        availableForDelivery: true,
        availableForPickup: true,
        isAvailable: true,
      },
      {
        producerId: productorJorge.id,
        jacId: jacElSalado.id,
        categoryId: catLacteos.id,
        title: "Queso Campesino Veredal Salado",
        description: "Elaborado con leche fresca de vaca recién ordeñada. Bloques frescos de 1 kilogramo.",
        price: 18000.0,
        unit: MarketUnit.KG,
        stockQuantity: 20.0,
        isOrganic: false,
        availableForDelivery: true,
        availableForPickup: true,
        isAvailable: true,
      },
    ],
  });

  // 8. MINGAS VEREDALES Y CARTELERA
  console.log("⛏️ Publicando Mingas Veredales y Circulares...");
  const postMinga = await prisma.post.create({
    data: {
      jacId: jacElSalado.id,
      authorUserId: presidenteSalado.id,
      scope: PostScope.JAC_LOCAL,
      type: PostType.COMMUNAL_WORK,
      priority: PostPriority.HIGH,
      title: "Gran Minga Veredal: Limpieza de Alcantarillas y Cunetas Vía Principal",
      slug: "gran-minga-veredal-limpieza-cunetas-2026",
      content:
        "Se convoca a todos los afiliados activos con predio o residencia a la jornada de mantenimiento preventivo ante la temporada de lluvias. Lugar de encuentro: Sector La Batea.",
      eventDate: new Date("2026-04-12T07:30:00Z"),
      location: "Sector La Batea, Vereda El Salado",
      requiresAttendanceConfirmation: true,
      isPublished: true,
    },
  });

  await prisma.mingaAttendance.create({
    data: {
      postId: postMinga.id,
      userId: campesinoJorge.id,
      jacId: jacElSalado.id,
      attending: true,
      notes: "Llevará pala y carretilla",
    },
  });

  // Alerta Urgente Municipal emitida por Asojuntas
  await prisma.post.create({
    data: {
      jacId: null, // Ámbito municipal Asojuntas
      authorUserId: superAdmin.id,
      scope: PostScope.MUNICIPAL_ASOJUNTAS,
      type: PostType.EMERGENCY_ALERT,
      priority: PostPriority.URGENT,
      title: "Alerta Vial Municipal: Paso Restringido en Sector Chucurí - La Renta",
      slug: "alerta-vial-paso-restringido-la-renta",
      content:
        "Por desprendimiento de banca se mantiene paso a un solo carril para vehículos de carga pesada. Maquinaria de la Gobernación en el punto.",
      location: "Vía San Vicente - Barrancabermeja Km 18",
      isPublished: true,
    },
  });

  // 9. ASAMBLEA GENERAL ORDINARIA
  console.log("🗳️ Programando Asamblea General de Afiliados...");
  const asamblea = await prisma.assembly.create({
    data: {
      jacId: jacElSalado.id,
      title: "Primera Asamblea General Ordinaria Vigencia 2026",
      description:
        "Rendición de cuentas de la Mesa Directiva, informe fiscal del año 2025 y votación del plan de inversión comunitario.",
      type: AssemblyType.ORDINARY,
      scheduledDate: new Date("2026-05-10T14:00:00Z"),
      location: "Sede Comunal Vereda El Salado",
      quorumPercentageRequired: 50,
      quorumReached: false,
      status: AssemblyStatus.SCHEDULED,
    },
  });

  await prisma.assemblyTopic.create({
    data: {
      assemblyId: asamblea.id,
      jacId: jacElSalado.id,
      title: "¿Aprueba usted los Estados Financieros de la JAC correspondientes al año 2025?",
      description: "Presentados por el Tesorero y con dictamen favorable del Fiscal comunal.",
      options: [
        { id: "SI", label: "A Favor (Sí)" },
        { id: "NO", label: "En Contra (No)" },
        { id: "BLANCO", label: "Voto en Blanco" },
      ],
      isOpen: true,
    },
  });

  // 10. BUZÓN CIUDADANO PQRSD
  console.log("📬 Registrando Radicado PQRSD...");
  await prisma.pqrsdTicket.create({
    data: {
      ticketNumber: "PQR-2026-0001",
      jacId: jacElSalado.id,
      userId: habitanteRosa.id,
      assignedToUserId: presidenteSalado.id,
      isAnonymous: false,
      type: PqrsdType.PETITION,
      status: PqrsdStatus.IN_PROGRESS,
      subject: "Solicitud de gestión para luminaria solar frente a la Escuela Rural",
      description:
        "Se solicita a la Mesa Directiva elevar petición formal a la Secretaría de Infraestructura Municipal para la instalación de una luminaria solar en el acceso a la escuela rural para seguridad de los niños al anochecer.",
      responseText:
        "Recibido por Presidencia. Se incluyó en el oficio radicado ante la Alcaldía Municipal en la comisión de obras del 20 de marzo.",
    },
  });

  console.log("✅ Siembra de datos completada exitosamente.");
  console.log("\nCredenciales de prueba generadas:");
  console.log("--------------------------------------------------");
  console.log("Asojuntas Super Admin : admin@asojuntas.org / Password123!");
  console.log("Presidente JAC Salado : presidente.salado@conectajac.org / Password123!");
  console.log("Secretaria JAC Salado : secretaria.salado@conectajac.org / Password123!");
  console.log("Tesorero JAC Salado   : tesorero.salado@conectajac.org / Password123!");
  console.log("Campesino Productor   : campesino.salado@conectajac.org / Password123!");
  console.log("Ciudadana Afiliada    : ciudadana.salado@conectajac.org / Password123!");
  console.log("--------------------------------------------------\n");
}

main()
  .catch((e) => {
    console.error("❌ Error durante la siembra de datos:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

