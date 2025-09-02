import { db } from "./index.js";
import {
  tenants,
  brands,
  users,
  memberships,
  serviceCategories,
  services,
  clients,
  appointments,
  staff,
  orders,
  orderItems,
  payments,
  clientCredits,
  clientCreditLedger
} from "./schema.js";

async function main() {
  const tenantId = crypto.randomUUID();
  const brandId = crypto.randomUUID();
  const ownerId = crypto.randomUUID();

  await db.insert(tenants).values({ id: tenantId, name: "Demo Salon" }).onConflictDoNothing();
  await db
    .insert(brands)
    .values({ id: brandId, tenantId, name: "Demo Salon", slug: "demo-salon" })
    .onConflictDoNothing();
  await db
    .insert(users)
    .values({
      id: ownerId,
      email: "owner@demo.salon",
      phone: "+15555550001",
      emailVerified: true,
      phoneVerified: true
    })
    .onConflictDoNothing();
  await db
    .insert(memberships)
    .values({ userId: ownerId, tenantId, role: "owner", isDefault: true })
    .onConflictDoNothing();

  const staff1 = crypto.randomUUID();
  const staff2 = crypto.randomUUID();
  await db
    .insert(staff)
    .values([
      { id: staff1, tenantId, name: "Sam Stylist", commissionEnabled: true, commissionRate: 10 },
      { id: staff2, tenantId, name: "Riley Colorist", commissionEnabled: false, commissionRate: 0 }
    ])
    .onConflictDoNothing();

  const catId = crypto.randomUUID();
  await db
    .insert(serviceCategories)
    .values({ id: catId, tenantId, name: "Hair", color: "#8b5cf6", sortOrder: 1 })
    .onConflictDoNothing();

  const svc1 = crypto.randomUUID();
  const svc2 = crypto.randomUUID();
  await db
    .insert(services)
    .values([
      { id: svc1, tenantId, categoryId: catId, name: "Haircut", description: "Classic cut", durationMin: 45, priceCents: 3500 },
      { id: svc2, tenantId, categoryId: catId, name: "Color", description: "Full color", durationMin: 90, priceCents: 9000 }
    ])
    .onConflictDoNothing();

  const client1 = crypto.randomUUID();
  const client2 = crypto.randomUUID();
  await db
    .insert(clients)
    .values([
      { id: client1, tenantId, name: "Alice Client", email: "alice@example.com", phone: "+15555550011" },
      { id: client2, tenantId, name: "Bob Client", email: "bob@example.com", phone: "+15555550012" }
    ])
    .onConflictDoNothing();

  const start = new Date();
  start.setHours(start.getHours() + 2);
  const end = new Date(start.getTime() + 45 * 60 * 1000);

  const apptId = crypto.randomUUID();
  await db
    .insert(appointments)
    .values({
      id: apptId,
      tenantId,
      clientId: client1,
      serviceId: svc1,
      providerId: staff1,
      startAt: start,
      endAt: end,
      status: "scheduled"
    })
    .onConflictDoNothing();

  const orderId = crypto.randomUUID();
  await db
    .insert(orders)
    .values({
      id: orderId,
      tenantId,
      clientId: client1,
      appointmentId: apptId,
      totalCents: 3500,
      status: "open"
    })
    .onConflictDoNothing();

  await db
    .insert(orderItems)
    .values({
      tenantId,
      orderId,
      serviceId: svc1,
      name: "Haircut",
      qty: 1,
      priceCents: 3500
    })
    .onConflictDoNothing();

  const paymentId = crypto.randomUUID();
  await db
    .insert(payments)
    .values({
      id: paymentId,
      tenantId,
      orderId,
      provider: "stripe",
      amountCents: 3500,
      status: "succeeded"
    })
    .onConflictDoNothing();

  await db
    .insert(clientCredits)
    .values({
      tenantId,
      clientId: client2,
      balanceCents: 1500
    })
    .onConflictDoNothing();

  await db
    .insert(clientCreditLedger)
    .values({
      tenantId,
      clientId: client2,
      type: "add",
      amountCents: 1500,
      refType: "seed",
      note: "Initial credit"
    })
    .onConflictDoNothing();

  console.log(
    JSON.stringify(
      {
        tenantId,
        brandId,
        ownerId,
        staff: [staff1, staff2],
        services: [svc1, svc2],
        clients: [client1, client2],
        orderId,
        paymentId
      },
      null,
      2
    )
  );
}

main()
  .then(() => {
    console.log("Seed done");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Seed failed", err);
    process.exit(1);
  });
