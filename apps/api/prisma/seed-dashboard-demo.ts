import { disconnectPrisma, prisma } from '../src/config/prisma';

const ensureLocalDatabase = (): void => {
  const rawUrl = process.env.DATABASE_URL;

  if (!rawUrl) {
    throw new Error('DATABASE_URL nije podešen.');
  }

  const hostname = new URL(rawUrl).hostname;

  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    throw new Error(`Dashboard DEMO seed je dozvoljen samo lokalno, a host je ${hostname}.`);
  }
};

const localToday = (): { iso: string; year: number; month: number; day: number } => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Belgrade',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const numberPart = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  const year = numberPart('year');
  const month = numberPart('month');
  const day = numberPart('day');

  return {
    year,
    month,
    day,
    iso: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
  };
};

const date = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);

const addDays = (iso: string, days: number): string => {
  const value = date(iso);
  value.setUTCDate(value.getUTCDate() + days);

  return value.toISOString().slice(0, 10);
};

const partnerIds = [
  'dashboard-demo-partner-1',
  'dashboard-demo-partner-2',
  'dashboard-demo-partner-3',
];
const supplierIds = [
  'dashboard-demo-supplier-1',
  'dashboard-demo-supplier-2',
  'dashboard-demo-supplier-3',
];
const driverIds = Array.from({ length: 6 }, (_, index) => `dashboard-demo-driver-${index + 1}`);
const vehicleIds = Array.from({ length: 6 }, (_, index) => `dashboard-demo-vehicle-${index + 1}`);
const tripIds = Array.from({ length: 12 }, (_, index) => `dashboard-demo-trip-${index + 1}`);

const seed = async (): Promise<void> => {
  ensureLocalDatabase();
  const today = localToday();
  const todayDate = date(today.iso);
  const monthDay = (preferred: number): Date =>
    date(
      `${today.year}-${String(today.month).padStart(2, '0')}-${String(Math.min(today.day, preferred)).padStart(2, '0')}`,
    );

  const partners = await Promise.all(
    [
      { companyName: 'DUNAV TOURS DEMO', nickname: 'Dunav Tours', pib: '109920001' },
      { companyName: 'KOŠARKAŠKI KLUB VOJVODINA DEMO', nickname: 'KK Vojvodina', pib: '109920002' },
      { companyName: 'OPŠTINA FRUŠKA GORA DEMO', nickname: 'Fruška Gora', pib: '109920003' },
    ].map((item, index) =>
      prisma.partner.upsert({
        where: { id: partnerIds[index] },
        create: {
          id: partnerIds[index],
          type: index === 1 ? 'SPORTS_CLUB' : index === 2 ? 'MUNICIPALITY' : 'TRAVEL_AGENCY',
          companyName: item.companyName,
          nickname: item.nickname,
          pib: item.pib,
          registrationNumber: `2192000${index + 1}`,
          address: `Demo ulica ${index + 1}`,
          city: index === 0 ? 'Novi Sad' : index === 1 ? 'Zrenjanin' : 'Sremska Mitrovica',
        },
        update: { companyName: item.companyName, nickname: item.nickname },
      }),
    ),
  );

  const suppliers = await Promise.all(
    [
      { name: 'EURO BUS SERVIS DEMO', pib: '109930001' },
      { name: 'OMV GORIVO DEMO', pib: '109930002' },
      { name: 'BANCA INTESA TROŠKOVI DEMO', pib: '109930003' },
    ].map((item, index) =>
      prisma.supplier.upsert({
        where: { id: supplierIds[index] },
        create: {
          id: supplierIds[index],
          name: item.name,
          pib: item.pib,
          registrationNumber: `2193000${index + 1}`,
          address: `Industrijska ${index + 10}`,
          city: 'Novi Sad',
          phone: `060/930-000${index + 1}`,
          note: 'DEMO podatak za dashboard.',
        },
        update: { name: item.name, note: 'DEMO podatak za dashboard.' },
      }),
    ),
  );

  const driverNames = [
    ['Milan', 'Jovanović'],
    ['Marko', 'Petrović'],
    ['Nikola', 'Ilić'],
    ['Aleksandar', 'Pavlović'],
    ['Dejan', 'Savić'],
    ['Ivan', 'Nikolić'],
  ] as const;
  const drivers = await Promise.all(
    driverNames.map(([firstName, lastName], index) =>
      prisma.driver.upsert({
        where: { id: driverIds[index] },
        create: {
          id: driverIds[index],
          firstName,
          lastName,
          jmbg: `01019908000${String(index + 1).padStart(2, '0')}`,
          dateOfBirth: date(`199${index}-01-01`),
          residencePlace: 'Novi Sad',
          residenceAddress: `Demo ulica ${index + 1}`,
          educationLevel: 'SSS',
          idCardNumber: `ID-DEMO-${index + 1}`,
          drivingLicenseNumber: `VD-DEMO-${index + 1}`,
          drivingLicenseCategory: 'D',
          licenseNumber: `LIC-DEMO-${index + 1}`,
          phone: `060/940-000${index + 1}`,
          email: `vozac${index + 1}@demo.local`,
          jobTitle: 'Vozač autobusa',
          status: 'ACTIVE',
        },
        update: { firstName, lastName, status: 'ACTIVE' },
      }),
    ),
  );

  const vehicleModels = [
    ['Setra', 'S 415', 'NS-101-DE'],
    ['MAN', "Lion's Coach", 'NS-102-DE'],
    ['Mercedes', 'Tourismo', 'NS-103-DE'],
    ['Neoplan', 'Tourliner', 'NS-104-DE'],
    ['Iveco', 'Crossway', 'NS-105-DE'],
    ['Temsa', 'HD 12', 'NS-106-DE'],
  ] as const;
  const vehicles = await Promise.all(
    vehicleModels.map(([make, model, licensePlate], index) =>
      prisma.vehicle.upsert({
        where: { id: vehicleIds[index] },
        create: {
          id: vehicleIds[index],
          make,
          model,
          licensePlate,
          vin: `WDBDASHBOARDDEMO${String(index + 1).padStart(2, '0')}`,
          year: 2018 + index,
          seatCount: 49 + index,
          type: 'BUS',
          fuelType: 'DIESEL',
          tachographType: 'DIGITAL',
          status: 'ACTIVE',
          initialMileageKm: 300_000 + index * 20_000,
          currentMileage: 320_000 + index * 20_000,
        },
        update: { make, model, licensePlate, status: 'ACTIVE' },
      }),
    ),
  );

  const routes = [
    ['Novi Sad', 'Beograd'],
    ['Novi Sad', 'Subotica'],
    ['Beograd', 'Zlatibor'],
    ['Novi Sad', 'Vršac'],
    ['Zrenjanin', 'Beograd'],
    ['Sremska Mitrovica', 'Novi Sad'],
    ['Novi Sad', 'Kopaonik'],
    ['Bačka Palanka', 'Beograd'],
    ['Novi Sad', 'Kragujevac'],
    ['Ruma', 'Vrdnik'],
    ['Novi Sad', 'Sombor'],
    ['Beograd', 'Novi Sad'],
  ] as const;

  for (const [index, tripId] of tripIds.entries()) {
    const route = routes[index];
    const partner = partners[index % partners.length];
    const invoiced = index < 7;
    const gross = 48_000 + index * 9_500;

    await prisma.trip.upsert({
      where: { id: tripId },
      create: {
        id: tripId,
        referenceNumber: `DASH-${String(index + 1).padStart(3, '0')}`,
        departureDate: todayDate,
        returnDate: todayDate,
        country: 'Srbija',
        origin: route?.[0] ?? 'Novi Sad',
        destination: route?.[1] ?? 'Beograd',
        passengerCount: 30 + index,
        partnerId: partner?.id ?? null,
        notes: 'DEMO današnja vožnja za prikaz dashboarda.',
        price: gross,
        paymentMethod: 'ACCOUNT',
        status: index < 3 ? 'IN_PROGRESS' : 'PLANNED',
        invoicedAt: invoiced ? todayDate : null,
        paidAt: null,
        invoiceDescription: invoiced ? `DEMO prevoz ${route?.[0]}–${route?.[1]}` : null,
        priceIncludesVat: invoiced ? true : null,
        invoiceDomesticAmount: invoiced ? gross : null,
        invoiceForeignAmount: invoiced ? 0 : null,
        invoiceNetAmount: invoiced ? Math.round((gross / 1.1) * 100) / 100 : null,
        invoiceVatAmount: invoiced ? Math.round((gross - gross / 1.1) * 100) / 100 : null,
        invoiceGrossAmount: invoiced ? gross : null,
      },
      update: {
        departureDate: todayDate,
        returnDate: todayDate,
        origin: route?.[0] ?? 'Novi Sad',
        destination: route?.[1] ?? 'Beograd',
        partnerId: partner?.id ?? null,
        status: index < 3 ? 'IN_PROGRESS' : 'PLANNED',
        invoicedAt: invoiced ? todayDate : null,
        paidAt: null,
        invoiceGrossAmount: invoiced ? gross : null,
      },
    });

    await prisma.tripVehicle.upsert({
      where: { tripId_vehicleId: { tripId, vehicleId: vehicles[index % vehicles.length]!.id } },
      create: { tripId, vehicleId: vehicles[index % vehicles.length]!.id },
      update: {},
    });
    await prisma.tripDriver.upsert({
      where: { tripId_driverId: { tripId, driverId: drivers[index % drivers.length]!.id } },
      create: { tripId, driverId: drivers[index % drivers.length]!.id },
      update: {},
    });
  }

  const expenseAmounts = [185_000, 126_500, 94_000, 72_300, 58_000, 41_900, 26_400];
  for (const [index, amountWithVat] of expenseAmounts.entries()) {
    const supplier = suppliers[index % suppliers.length]!;
    const amountWithoutVat = Math.round((amountWithVat / 1.2) * 100) / 100;

    await prisma.companyExpense.upsert({
      where: { id: `dashboard-demo-expense-${index + 1}` },
      create: {
        id: `dashboard-demo-expense-${index + 1}`,
        issuedAt: date(addDays(today.iso, -(index + 2))),
        paidAt: null,
        invoiceNumber: `DASH-T-${String(index + 1).padStart(3, '0')}`,
        supplier: supplier.name,
        supplierId: supplier.id,
        description:
          index % 3 === 0
            ? 'Servis autobusa — DEMO'
            : index % 3 === 1
              ? 'Gorivo — DEMO'
              : 'Bankarske naknade — DEMO',
        amount: amountWithVat,
        amountWithoutVat,
        vatAmount: Math.round((amountWithVat - amountWithoutVat) * 100) / 100,
        amountWithVat,
        paymentMethod: 'ACCOUNT',
        scope: index % 3 === 2 ? 'BANK' : index % 3 === 0 ? 'VEHICLE' : 'COMMON',
        vehicleId: index % 3 === 0 ? vehicles[index % vehicles.length]!.id : null,
      },
      update: { paidAt: null, amount: amountWithVat, amountWithVat },
    });
  }

  const consumptionRates = [18.5, 21.2, 24.8, 27.4, 30.1, 34.6];
  for (const [index, rate] of consumptionRates.entries()) {
    const kmDriven = 500 + index * 25;
    const litersFilled = Math.round(((rate * kmDriven) / 100) * 100) / 100;

    await prisma.fuelLog.upsert({
      where: { id: `dashboard-demo-fuel-${index + 1}` },
      create: {
        id: `dashboard-demo-fuel-${index + 1}`,
        vehicleId: vehicles[index]!.id,
        fueledAt: monthDay(index + 2),
        location: 'Novi Sad',
        driverId: drivers[index]!.id,
        fuelType: 'DIESEL',
        litersFilled,
        odometerKm: 320_000 + index * 20_000,
        cost: Math.round(litersFilled * 205 * 100) / 100,
        paymentMethod: 'ACCOUNT',
        supplier: suppliers[1]!.name,
        supplierId: suppliers[1]!.id,
        note: 'DEMO sipanje za dashboard.',
        kmDriven,
        consumptionPer100Km: rate,
      },
      update: { fueledAt: monthDay(index + 2), litersFilled, kmDriven, consumptionPer100Km: rate },
    });
  }

  const documentTypes = [
    'MEDICAL_CERTIFICATE',
    'ID_CARD',
    'DRIVING_LICENSE',
    'MEDICAL_CERTIFICATE',
    'LICENSE',
    'ID_CARD',
  ] as const;
  for (const [index, type] of documentTypes.entries()) {
    const expiresAt = addDays(today.iso, -(index + 1) * 3);

    await prisma.driverDocument.upsert({
      where: { id: `dashboard-demo-driver-document-${index + 1}` },
      create: {
        id: `dashboard-demo-driver-document-${index + 1}`,
        driverId: drivers[index]!.id,
        type,
        documentNumber: `DOC-DEMO-${index + 1}`,
        issuedAt: date(addDays(expiresAt, -365)),
        expiresAt: date(expiresAt),
      },
      update: { type, expiresAt: date(expiresAt) },
    });
  }

  for (const [index, vehicle] of vehicles.entries()) {
    const expiresAt = addDays(today.iso, -(index + 1) * 2);

    if (index % 2 === 0) {
      await prisma.vehicleInspection.upsert({
        where: { id: `dashboard-demo-inspection-${index + 1}` },
        create: {
          id: `dashboard-demo-inspection-${index + 1}`,
          vehicleId: vehicle.id,
          type: 'REGULAR',
          inspectedAt: date(addDays(expiresAt, -365)),
          expiresAt: date(expiresAt),
        },
        update: { expiresAt: date(expiresAt) },
      });
    } else {
      await prisma.tachographCalibration.upsert({
        where: { id: `dashboard-demo-tachograph-${index + 1}` },
        create: {
          id: `dashboard-demo-tachograph-${index + 1}`,
          vehicleId: vehicle.id,
          calibratedAt: date(addDays(expiresAt, -730)),
          expiresAt: date(expiresAt),
        },
        update: { expiresAt: date(expiresAt) },
      });
    }
  }

  console.log('Dashboard DEMO podaci su spremni u lokalnoj bazi.');
  console.log(`Datum dashboarda: ${today.iso}`);
  console.log('Kreirano/ažurirano: 12 vožnji, 7 dugovanja, 6 vozača, 6 vozila i rokovi.');
};

seed()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrisma();
  });
