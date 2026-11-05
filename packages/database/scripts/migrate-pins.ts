import { PrismaClient } from "../src/client/index.js";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando migración y sincronización de PINs de acceso móvil...");

  const users = await prisma.user.findMany({
    select: {
      id: true,
      identificationNumber: true,
      firstName: true,
      lastName: true,
      accessPin: true,
    },
  });

  console.log(`Encontrados ${users.length} usuarios.`);
  let updatedCount = 0;

  for (const user of users) {
    const defaultPin = user.identificationNumber.trim().slice(-4);
    if (!user.accessPin || user.accessPin !== defaultPin) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          accessPin: user.accessPin || defaultPin,
        },
      });
      updatedCount++;
      console.log(`Usuario ${user.firstName} ${user.lastName} (${user.identificationNumber}) -> PIN: ${user.accessPin || defaultPin}`);
    }
  }

  console.log(`Migración completada. Se actualizaron ${updatedCount} usuarios.`);
}

main()
  .catch((e) => {
    console.error("Error en migración:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

