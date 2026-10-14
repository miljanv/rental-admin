import { disconnectPrisma, prisma, prismaUnscoped } from '../src/config/prisma';
import { requireOrganizationId, runWithTenant } from '../src/utils/tenant-context';

const date = (value: string): Date => new Date(`${value}T00:00:00.000Z`);

const supplierIds = {
  nis: 'demo-supplier-nis',
  telecom: 'demo-supplier-telekom',
  service: 'demo-supplier-servis-bus',
} as const;

const partnerIds = {
  agency: 'demo-partner-balkan-tours',
  club: 'demo-partner-fk-mladost',
} as const;

const expenseIds = {
  telecomMay: 'demo-expense-telekom-2026-0526',
  nisJune: 'demo-expense-nis-2026-0626',
  nis: 'demo-expense-nis-2026-1001',
  telecom: 'demo-expense-telekom-2026-1001',
  service: 'demo-expense-servis-2026-1001',
} as const;

const tripIds = {
  agencyMay: 'demo-trip-balkan-tours-2026-0526',
  clubJune: 'demo-trip-fk-mladost-2026-0626',
  agency: 'demo-trip-balkan-tours-2026-1001',
  club: 'demo-trip-fk-mladost-2026-1001',
} as const;

const upsertSupplier = async (
  id: string,
  data: {
    name: string;
    pib: string;
    city: string;
    address: string;
    contactPerson: string;
    phone: string;
  },
) =>
  prisma.supplier.upsert({
    where: { id },
    create: {
      id,
      organizationId: requireOrganizationId(),
      ...data,
      note: 'DEMO podaci za proveru uvoza bankarskih izvoda.',
    },
    update: { ...data, note: 'DEMO podaci za proveru uvoza bankarskih izvoda.' },
  });

const upsertPartnerAccount = async (partnerId: string, accountNumber: string): Promise<void> => {
  const organizationId = requireOrganizationId();
  await prisma.partnerBankAccount.upsert({
    where: { organizationId_accountNumber: { organizationId, accountNumber } },
    create: { organizationId, partnerId, accountNumber },
    update: { partnerId },
  });
};

const upsertSupplierAccount = async (supplierId: string, accountNumber: string): Promise<void> => {
  const organizationId = requireOrganizationId();
  await prisma.supplierBankAccount.upsert({
    where: { organizationId_accountNumber: { organizationId, accountNumber } },
    create: { organizationId, supplierId, accountNumber },
    update: { supplierId },
  });
};

const seed = async (): Promise<void> => {
  if (process.env.RESET_ALL_FINANCES === 'true') {
    await prisma.paymentAllocation.deleteMany();
    await prisma.financeTransaction.deleteMany();
    await prisma.companyExpense.deleteMany();
    await prisma.trip.updateMany({
      data: {
        paidAt: null,
        invoicedAt: null,
        invoiceDescription: null,
        priceIncludesVat: null,
        invoiceDomesticAmount: null,
        invoiceForeignAmount: null,
        invoiceDomesticKm: null,
        invoiceTotalKm: null,
        invoiceNetAmount: null,
        invoiceVatAmount: null,
        invoiceGrossAmount: null,
        invoiceGroupId: null,
      },
    });
    console.log('Postojeći finansijski podaci su obrisani.');
  } else {
    await prisma.paymentAllocation.deleteMany({
      where: { transaction: { sourceId: { startsWith: 'bank:160000000009999999:demo-' } } },
    });
    await prisma.financeTransaction.deleteMany({
      where: { sourceId: { startsWith: 'bank:160000000009999999:demo-' } },
    });
  }

  const [nis, telecom, service] = await Promise.all([
    upsertSupplier(supplierIds.nis, {
      name: 'NIS PETROL DEMO',
      pib: '109900001',
      city: 'Novi Sad',
      address: 'Narodnog fronta 12',
      contactPerson: 'Demo kontakt NIS',
      phone: '060/900-0001',
    }),
    upsertSupplier(supplierIds.telecom, {
      name: 'TELEKOM SRBIJA DEMO',
      pib: '109900002',
      city: 'Beograd',
      address: 'Takovska 2',
      contactPerson: 'Demo kontakt Telekom',
      phone: '060/900-0002',
    }),
    upsertSupplier(supplierIds.service, {
      name: 'SERVIS BUS DEMO',
      pib: '109900003',
      city: 'Novi Sad',
      address: 'Industrijska 25',
      contactPerson: 'Marko Marković',
      phone: '060/900-0003',
    }),
  ]);

  await Promise.all([
    upsertSupplierAccount(nis.id, '160-0000000011111-11'),
    upsertSupplierAccount(telecom.id, '160-0000000022222-22'),
  ]);
  await prisma.supplierBankAccount.deleteMany({
    where: { supplierId: service.id, accountNumber: '160-0000000033333-33' },
  });

  const [agency, club] = await Promise.all([
    prisma.partner.upsert({
      where: { id: partnerIds.agency },
      create: {
        organizationId: requireOrganizationId(),
        id: partnerIds.agency,
        type: 'TRAVEL_AGENCY',
        companyName: 'BALKAN TOURS DEMO DOO',
        nickname: 'Balkan Tours Demo',
        address: 'Bulevar Evrope 44',
        city: 'Novi Sad',
        pib: '109910001',
        registrationNumber: '21910001',
      },
      update: {
        type: 'TRAVEL_AGENCY',
        companyName: 'BALKAN TOURS DEMO DOO',
        nickname: 'Balkan Tours Demo',
        address: 'Bulevar Evrope 44',
        city: 'Novi Sad',
        pib: '109910001',
        registrationNumber: '21910001',
      },
    }),
    prisma.partner.upsert({
      where: { id: partnerIds.club },
      create: {
        organizationId: requireOrganizationId(),
        id: partnerIds.club,
        type: 'SPORTS_CLUB',
        companyName: 'FK MLADOST DEMO',
        nickname: 'Mladost Demo',
        address: 'Sportska 8',
        city: 'Bačka Palanka',
        pib: '109910002',
        registrationNumber: '21910002',
      },
      update: {
        type: 'SPORTS_CLUB',
        companyName: 'FK MLADOST DEMO',
        nickname: 'Mladost Demo',
        address: 'Sportska 8',
        city: 'Bačka Palanka',
        pib: '109910002',
        registrationNumber: '21910002',
      },
    }),
  ]);

  await Promise.all([
    upsertPartnerAccount(agency.id, '265-0000000044444-44'),
    upsertPartnerAccount(club.id, '205-0000000055555-55'),
  ]);

  await Promise.all([
    prisma.companyExpense.upsert({
      where: { id: expenseIds.telecomMay },
      create: {
        organizationId: requireOrganizationId(),
        id: expenseIds.telecomMay,
        issuedAt: date('2026-05-05'),
        paidAt: null,
        invoiceNumber: 'TEL-DEMO-0526',
        supplier: telecom.name,
        supplierId: telecom.id,
        description: 'Telefon i internet za maj — DEMO',
        amount: 6_000,
        amountWithoutVat: 5_000,
        vatAmount: 1_000,
        amountWithVat: 6_000,
        paymentMethod: 'ACCOUNT',
        scope: 'COMMON',
      },
      update: {
        issuedAt: date('2026-05-05'),
        paidAt: null,
        invoiceNumber: 'TEL-DEMO-0526',
        supplier: telecom.name,
        supplierId: telecom.id,
        description: 'Telefon i internet za maj — DEMO',
        amount: 6_000,
        amountWithoutVat: 5_000,
        vatAmount: 1_000,
        amountWithVat: 6_000,
        paymentMethod: 'ACCOUNT',
        scope: 'COMMON',
      },
    }),
    prisma.companyExpense.upsert({
      where: { id: expenseIds.nisJune },
      create: {
        organizationId: requireOrganizationId(),
        id: expenseIds.nisJune,
        issuedAt: date('2026-06-04'),
        paidAt: null,
        invoiceNumber: 'NIS-DEMO-0626',
        supplier: nis.name,
        supplierId: nis.id,
        description: 'Gorivo po zbirnom računu za jun — DEMO',
        amount: 12_000,
        amountWithoutVat: 10_000,
        vatAmount: 2_000,
        amountWithVat: 12_000,
        paymentMethod: 'ACCOUNT',
        scope: 'COMMON',
      },
      update: {
        issuedAt: date('2026-06-04'),
        paidAt: null,
        invoiceNumber: 'NIS-DEMO-0626',
        supplier: nis.name,
        supplierId: nis.id,
        description: 'Gorivo po zbirnom računu za jun — DEMO',
        amount: 12_000,
        amountWithoutVat: 10_000,
        vatAmount: 2_000,
        amountWithVat: 12_000,
        paymentMethod: 'ACCOUNT',
        scope: 'COMMON',
      },
    }),
    prisma.companyExpense.upsert({
      where: { id: expenseIds.nis },
      create: {
        organizationId: requireOrganizationId(),
        id: expenseIds.nis,
        issuedAt: date('2026-10-01'),
        paidAt: null,
        invoiceNumber: 'NIS-DEMO-1001',
        supplier: nis.name,
        supplierId: nis.id,
        description: 'Gorivo po zbirnom računu — DEMO',
        amount: 18_000,
        amountWithoutVat: 15_000,
        vatAmount: 3_000,
        amountWithVat: 18_000,
        paymentMethod: 'ACCOUNT',
        scope: 'COMMON',
      },
      update: {
        issuedAt: date('2026-10-01'),
        paidAt: null,
        invoiceNumber: 'NIS-DEMO-1001',
        supplier: nis.name,
        supplierId: nis.id,
        description: 'Gorivo po zbirnom računu — DEMO',
        amount: 18_000,
        amountWithoutVat: 15_000,
        vatAmount: 3_000,
        amountWithVat: 18_000,
        paymentMethod: 'ACCOUNT',
        scope: 'COMMON',
      },
    }),
    prisma.companyExpense.upsert({
      where: { id: expenseIds.telecom },
      create: {
        organizationId: requireOrganizationId(),
        id: expenseIds.telecom,
        issuedAt: date('2026-10-02'),
        paidAt: null,
        invoiceNumber: 'TEL-DEMO-1001',
        supplier: telecom.name,
        supplierId: telecom.id,
        description: 'Telefon i internet — DEMO',
        amount: 7_200,
        amountWithoutVat: 6_000,
        vatAmount: 1_200,
        amountWithVat: 7_200,
        paymentMethod: 'ACCOUNT',
        scope: 'COMMON',
      },
      update: {
        issuedAt: date('2026-10-02'),
        paidAt: null,
        invoiceNumber: 'TEL-DEMO-1001',
        supplier: telecom.name,
        supplierId: telecom.id,
        description: 'Telefon i internet — DEMO',
        amount: 7_200,
        amountWithoutVat: 6_000,
        vatAmount: 1_200,
        amountWithVat: 7_200,
        paymentMethod: 'ACCOUNT',
        scope: 'COMMON',
      },
    }),
    prisma.companyExpense.upsert({
      where: { id: expenseIds.service },
      create: {
        organizationId: requireOrganizationId(),
        id: expenseIds.service,
        issuedAt: date('2026-10-03'),
        paidAt: null,
        invoiceNumber: 'SRV-DEMO-1001',
        supplier: service.name,
        supplierId: service.id,
        description: 'Redovan servis autobusa — DEMO',
        amount: 36_000,
        amountWithoutVat: 30_000,
        vatAmount: 6_000,
        amountWithVat: 36_000,
        paymentMethod: 'ACCOUNT',
        scope: 'COMMON',
      },
      update: {
        issuedAt: date('2026-10-03'),
        paidAt: null,
        invoiceNumber: 'SRV-DEMO-1001',
        supplier: service.name,
        supplierId: service.id,
        description: 'Redovan servis autobusa — DEMO',
        amount: 36_000,
        amountWithoutVat: 30_000,
        vatAmount: 6_000,
        amountWithVat: 36_000,
        paymentMethod: 'ACCOUNT',
        scope: 'COMMON',
      },
    }),
  ]);

  await Promise.all([
    prisma.trip.upsert({
      where: { id: tripIds.agencyMay },
      create: {
        organizationId: requireOrganizationId(),
        id: tripIds.agencyMay,
        referenceNumber: 'BT-DEMO-0526',
        departureDate: date('2026-05-02'),
        returnDate: date('2026-05-02'),
        country: 'Srbija',
        origin: 'Novi Sad',
        destination: 'Vršac',
        passengerCount: 40,
        partnerId: agency.id,
        notes: 'DEMO majska vožnja za proveru finansijskog dijagrama.',
        price: 44_000,
        paymentMethod: 'ACCOUNT',
        status: 'COMPLETED',
        paidAt: null,
        invoicedAt: date('2026-05-05'),
        invoiceDescription: 'Prevoz putnika Novi Sad–Vršac — DEMO maj',
        priceIncludesVat: true,
        invoiceDomesticAmount: 44_000,
        invoiceForeignAmount: 0,
        invoiceNetAmount: 40_000,
        invoiceVatAmount: 4_000,
        invoiceGrossAmount: 44_000,
      },
      update: {
        referenceNumber: 'BT-DEMO-0526',
        partnerId: agency.id,
        paidAt: null,
        invoicedAt: date('2026-05-05'),
        invoiceNetAmount: 40_000,
        invoiceVatAmount: 4_000,
        invoiceGrossAmount: 44_000,
      },
    }),
    prisma.trip.upsert({
      where: { id: tripIds.clubJune },
      create: {
        organizationId: requireOrganizationId(),
        id: tripIds.clubJune,
        referenceNumber: 'FK-DEMO-0626',
        departureDate: date('2026-06-03'),
        returnDate: date('2026-06-03'),
        country: 'Srbija',
        origin: 'Bačka Palanka',
        destination: 'Kragujevac',
        passengerCount: 28,
        partnerId: club.id,
        notes: 'DEMO junska vožnja za proveru finansijskog dijagrama.',
        price: 66_000,
        paymentMethod: 'ACCOUNT',
        status: 'COMPLETED',
        paidAt: null,
        invoicedAt: date('2026-06-05'),
        invoiceDescription: 'Prevoz ekipe Bačka Palanka–Kragujevac — DEMO jun',
        priceIncludesVat: true,
        invoiceDomesticAmount: 66_000,
        invoiceForeignAmount: 0,
        invoiceNetAmount: 60_000,
        invoiceVatAmount: 6_000,
        invoiceGrossAmount: 66_000,
      },
      update: {
        referenceNumber: 'FK-DEMO-0626',
        partnerId: club.id,
        paidAt: null,
        invoicedAt: date('2026-06-05'),
        invoiceNetAmount: 60_000,
        invoiceVatAmount: 6_000,
        invoiceGrossAmount: 66_000,
      },
    }),
    prisma.trip.upsert({
      where: { id: tripIds.agency },
      create: {
        organizationId: requireOrganizationId(),
        id: tripIds.agency,
        referenceNumber: 'BT-DEMO-1001',
        departureDate: date('2026-09-28'),
        returnDate: date('2026-09-28'),
        country: 'Srbija',
        origin: 'Novi Sad',
        destination: 'Beograd',
        passengerCount: 42,
        partnerId: agency.id,
        notes: 'DEMO vožnja za proveru povezivanja izvoda.',
        price: 55_000,
        paymentMethod: 'ACCOUNT',
        status: 'COMPLETED',
        paidAt: null,
        invoicedAt: date('2026-10-01'),
        invoiceDescription: 'Prevoz putnika Novi Sad–Beograd — DEMO',
        priceIncludesVat: true,
        invoiceDomesticAmount: 55_000,
        invoiceForeignAmount: 0,
        invoiceNetAmount: 50_000,
        invoiceVatAmount: 5_000,
        invoiceGrossAmount: 55_000,
      },
      update: {
        referenceNumber: 'BT-DEMO-1001',
        partnerId: agency.id,
        paidAt: null,
        invoicedAt: date('2026-10-01'),
        invoiceNetAmount: 50_000,
        invoiceVatAmount: 5_000,
        invoiceGrossAmount: 55_000,
      },
    }),
    prisma.trip.upsert({
      where: { id: tripIds.club },
      create: {
        organizationId: requireOrganizationId(),
        id: tripIds.club,
        referenceNumber: 'FK-DEMO-1001',
        departureDate: date('2026-09-30'),
        returnDate: date('2026-09-30'),
        country: 'Srbija',
        origin: 'Bačka Palanka',
        destination: 'Subotica',
        passengerCount: 30,
        partnerId: club.id,
        notes: 'DEMO vožnja za proveru preplate.',
        price: 88_000,
        paymentMethod: 'ACCOUNT',
        status: 'COMPLETED',
        paidAt: null,
        invoicedAt: date('2026-10-02'),
        invoiceDescription: 'Prevoz ekipe Bačka Palanka–Subotica — DEMO',
        priceIncludesVat: true,
        invoiceDomesticAmount: 88_000,
        invoiceForeignAmount: 0,
        invoiceNetAmount: 80_000,
        invoiceVatAmount: 8_000,
        invoiceGrossAmount: 88_000,
      },
      update: {
        referenceNumber: 'FK-DEMO-1001',
        partnerId: club.id,
        paidAt: null,
        invoicedAt: date('2026-10-02'),
        invoiceNetAmount: 80_000,
        invoiceVatAmount: 8_000,
        invoiceGrossAmount: 88_000,
      },
    }),
  ]);

  console.log('DEMO podaci za izvode su spremni.');
  console.log('Dobavljači: NIS PETROL DEMO, TELEKOM SRBIJA DEMO, SERVIS BUS DEMO.');
  console.log('Partneri: BALKAN TOURS DEMO DOO, FK MLADOST DEMO.');
  console.log('XML fajlovi: test-data/bank-statements/*.xml');
};

/** Id of the organization the tenancy migration creates for all pre-existing data. */
const MIGRATED_ORGANIZATION_ID = 'cmseedorg0000000000000001';

/** The demo data goes into the migrated organization, or the oldest one if it is gone. */
const seedInDemoOrganization = async (): Promise<void> => {
  const organization =
    (await prismaUnscoped.organization.findUnique({ where: { id: MIGRATED_ORGANIZATION_ID } })) ??
    (await prismaUnscoped.organization.findFirst({ orderBy: { createdAt: 'asc' } }));

  if (!organization) {
    throw new Error('Nema nijedne firme u bazi. Prvo pokrenite migracije.');
  }

  await runWithTenant({ userId: null, organizationId: organization.id }, seed);
};

seedInDemoOrganization()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrisma();
  });
