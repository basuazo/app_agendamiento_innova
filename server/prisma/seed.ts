// dotenv se carga antes via: ts-node -r dotenv/config (lee server/.env automáticamente)
import { PrismaClient, Role, BookingPurpose, BookingStatus, ResourceCategory } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Limpiar tablas en orden FK correcto
  await prisma.certificationRequest.deleteMany();
  await prisma.certification.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.trainingExemption.deleteMany();
  await prisma.training.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash('password123', 10);
  const adminPassword = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.create({
    data: { name: 'Administrador', email: 'admin@cowork.cl', password: adminPassword, role: Role.ADMIN, isVerified: true },
  });

  const maria = await prisma.user.create({
    data: { name: 'María González', email: 'maria@test.cl', password: hashedPassword, isVerified: true },
  });
  const juan = await prisma.user.create({
    data: { name: 'Juan Pérez', email: 'juan@test.cl', password: hashedPassword, isVerified: true },
  });
  await prisma.user.create({
    data: { name: 'Sofía Ramírez', email: 'sofia@test.cl', password: hashedPassword, isVerified: true },
  });

  console.log('✅ Usuarios creados');

  // 18 máquinas en 9 categorías
  const xb2500_1 = await prisma.resource.create({
    data: { name: 'XB2500 1', description: 'Máquina de coser recta casera Brother XB2500', category: ResourceCategory.RECTA_CASERA },
  });
  const xb2500_2 = await prisma.resource.create({
    data: { name: 'XB2500 2', description: 'Máquina de coser recta casera Brother XB2500', category: ResourceCategory.RECTA_CASERA },
  });
  const st371_1 = await prisma.resource.create({
    data: { name: 'ST371 1', description: 'Máquina de coser recta casera Brother ST371', category: ResourceCategory.RECTA_CASERA },
  });
  const st371_2 = await prisma.resource.create({
    data: { name: 'ST371 2', description: 'Máquina de coser recta casera Brother ST371', category: ResourceCategory.RECTA_CASERA },
  });
  const bm3850_1 = await prisma.resource.create({
    data: { name: 'BM3850 1', description: 'Máquina de coser recta casera Brother BM3850', category: ResourceCategory.RECTA_CASERA },
  });
  const bm3850_2 = await prisma.resource.create({
    data: { name: 'BM3850 2', description: 'Máquina de coser recta casera Brother BM3850', category: ResourceCategory.RECTA_CASERA },
  });

  await prisma.resource.create({
    data: { name: 'Brother 3534DT', description: 'Máquina overlock casera Brother 3534DT', category: ResourceCategory.OVERLOCK_CASERA },
  });

  await prisma.resource.create({
    data: { name: 'Brother CV3550', description: 'Collaretera Brother CV3550', category: ResourceCategory.COLLERETERA },
  });

  const pe910l = await prisma.resource.create({
    data: { name: 'Brother PE 910 L', description: 'Máquina bordadora Brother PE 910 L', category: ResourceCategory.BORDADORA },
  });

  await prisma.resource.create({
    data: { name: 'Brother SP1', description: 'Impresora de sublimación Brother SP1', category: ResourceCategory.IMPRESORA_SUBLIMACION },
  });

  await prisma.resource.create({
    data: { name: 'Brother SDX225', description: 'Plotter de corte Brother SDX225', category: ResourceCategory.PLOTTER_CORTE },
  });

  await prisma.resource.create({
    data: { name: 'Plana 60×40', description: 'Plancha de sublimación plana 60×40 cm', category: ResourceCategory.PLANCHA_SUBLIMACION },
  });

  await prisma.resource.create({
    data: { name: 'Recta Brother S 7180A', description: 'Máquina recta industrial Brother S 7180A', category: ResourceCategory.INDUSTRIAL },
  });
  await prisma.resource.create({
    data: { name: 'Overlock Brother FB-N31-5030', description: 'Máquina overlock industrial Brother FB-N31-5030', category: ResourceCategory.INDUSTRIAL },
  });

  await prisma.resource.create({
    data: { name: 'Plancha Silverstar', description: 'Plancha de vapor Silverstar profesional', category: ResourceCategory.PLANCHA_VAPOR },
  });

  await prisma.resource.create({
    data: {
      name: 'Mesones de Corte', description: '4 mesones de corte compartidos — indicar cuántos ocuparás (1-4)',
      category: ResourceCategory.MESON_CORTE, capacity: 4, requiresCertification: false,
    },
  });

  await prisma.resource.create({
    data: {
      name: 'Espacio de Reuniones', description: 'Sala de reuniones — bloquea todos los mesones de corte al reservar',
      category: ResourceCategory.ESPACIO_REUNION, capacity: 1, requiresCertification: true,
    },
  });

  console.log('✅ Recursos creados (15 máquinas + Mesones de Corte + Espacio de Reuniones)');

  // Certificaciones de ejemplo para María
  await prisma.certification.create({
    data: {
      userId: maria.id,
      resourceCategory: ResourceCategory.RECTA_CASERA,
      certifiedById: admin.id,
      notes: 'Certificada en inducción inicial',
    },
  });
  await prisma.certification.create({
    data: {
      userId: maria.id,
      resourceCategory: ResourceCategory.OVERLOCK_CASERA,
      certifiedById: admin.id,
    },
  });

  // Solicitud pendiente para María
  await prisma.certificationRequest.create({
    data: {
      userId: maria.id,
      resourceCategory: ResourceCategory.BORDADORA,
      status: 'PENDING',
    },
  });

  console.log('✅ Certificaciones de ejemplo creadas');

  // Reservas de prueba
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - today.getDay() + 1);
  monday.setHours(0, 0, 0, 0);

  const makeDateTime = (daysFromMonday: number, hour: number) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + daysFromMonday);
    d.setHours(hour, 0, 0, 0);
    return d;
  };

  await prisma.booking.createMany({
    data: [
      {
        userId: maria.id, resourceId: xb2500_1.id,
        startTime: makeDateTime(0, 9), endTime: makeDateTime(0, 10),
        purpose: BookingPurpose.PRODUCE, produceItem: 'Camisas', produceQty: 10,
        notes: 'Producción semanal', status: BookingStatus.CONFIRMED,
      },
      {
        userId: maria.id, resourceId: bm3850_1.id,
        startTime: makeDateTime(1, 10), endTime: makeDateTime(1, 11),
        purpose: BookingPurpose.LEARN, notes: 'Práctica de puntadas',
        status: BookingStatus.CONFIRMED,
      },
      {
        userId: juan.id, resourceId: xb2500_2.id,
        startTime: makeDateTime(2, 9), endTime: makeDateTime(2, 10),
        purpose: BookingPurpose.PRODUCE, produceItem: 'Pantalones', produceQty: 5,
        status: BookingStatus.CONFIRMED,
      },
      {
        userId: maria.id, resourceId: pe910l.id,
        startTime: makeDateTime(2, 14), endTime: makeDateTime(2, 15),
        purpose: BookingPurpose.DESIGN, notes: 'Bordado de logo',
        status: BookingStatus.PENDING,
      },
      {
        userId: juan.id, resourceId: st371_1.id,
        startTime: makeDateTime(3, 11), endTime: makeDateTime(3, 12),
        purpose: BookingPurpose.PRODUCE, produceItem: 'Delantales', produceQty: 8,
        status: BookingStatus.CONFIRMED,
      },
    ],
  });

  console.log('✅ Reservas de prueba creadas');

  await prisma.comment.createMany({
    data: [
      {
        userId: admin.id,
        content: '¡Bienvenidas al espacio textil! Recuerden respetar los horarios y dejar las máquinas en buen estado.',
        tag: 'GENERAL',
      },
      {
        userId: maria.id,
        content: 'Las rectas Brother XB2500 están funcionando excelente para puntada recta y zigzag.',
        tag: 'GENERAL',
      },
    ],
  });

  console.log('✅ Comentarios creados');
  console.log('\n🎉 Seed completado exitosamente!\n');
  console.log('Credenciales:');
  console.log('  Admin:  admin@cowork.cl / admin123');
  console.log('  User 1: maria@test.cl  / password123');
  console.log('  User 2: juan@test.cl   / password123');
  console.log('  User 3: sofia@test.cl  / password123');
}

main()
  .catch((e) => { console.error('❌ Error en seed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
