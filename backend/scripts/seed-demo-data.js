const dotenv = require('dotenv');

dotenv.config();

const { pool } = require('../config/db');
const User = require('../models/User');
const Gadget = require('../models/Gadget');
const LaptopSpec = require('../models/LaptopSpec');
const PhoneSpec = require('../models/PhoneSpec');
const { ensureBootstrapAdminUser } = require('../services/userBootstrapService');

const DEFAULT_DEMO_PASSWORD_HASH = '$2a$10$NAN2KMR/bwRn7HbmvwCaLuzQZxoFzyR8GquiMhPP7Y9NPNTLNWcZ2';
const DEMO_OPERATOR = process.env.ADMIN_USERNAME?.trim() || 'demo-seed';
const DEMO_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH?.trim() || DEFAULT_DEMO_PASSWORD_HASH;

const DEMO_USERS = [
  {
    email: 'mercy.soko@sikaprime.test',
    username: 'mercy.soko',
    full_name: 'Mercy Soko',
    role: 'admin',
    must_change_password: false,
    last_login_at: '2026-03-14 08:40:00'
  },
  {
    email: 'martha.phiri@sikaprime.test',
    username: 'martha.phiri',
    full_name: 'Martha Phiri',
    role: 'staff',
    must_change_password: false,
    last_login_at: '2026-03-14 10:15:00'
  },
  {
    email: 'patrick.moyo@sikaprime.test',
    username: 'patrick.moyo',
    full_name: 'Patrick Moyo',
    role: 'staff',
    must_change_password: true,
    last_login_at: null
  }
];

const DEMO_GADGETS = [
  {
    name: 'Latitude 7420',
    type: 'laptop',
    brand: 'Dell',
    model: '7420',
    cost_price: 12500,
    list_price: 14900,
    imagePath: '/demo/laptop-sky.svg',
    description: '14-inch business laptop with a clean chassis and dependable battery life.',
    specs: {
      processor: 'Intel Core i5 11th Gen',
      ram: '16GB',
      storage: '512GB SSD',
      battery_hours: '8 hrs',
      screen_size: '14"',
      graphics: 'Intel Iris Xe'
    }
  },
  {
    name: 'MacBook Air M1',
    type: 'laptop',
    brand: 'Apple',
    model: 'A2337',
    cost_price: 16800,
    list_price: 19950,
    imagePath: '/demo/laptop-sky.svg',
    description: 'Lightweight premium laptop for work, content, and all-day portability.',
    specs: {
      processor: 'Apple M1',
      ram: '8GB',
      storage: '256GB SSD',
      battery_hours: '12 hrs',
      screen_size: '13.3"',
      graphics: 'Apple 7-core GPU'
    }
  },
  {
    name: 'Galaxy S23',
    type: 'phone',
    brand: 'Samsung',
    model: 'SM-S911B',
    cost_price: 10200,
    list_price: 12600,
    imagePath: '/demo/phone-coral.svg',
    description: 'Bright AMOLED phone with strong cameras and a sharp compact display.',
    specs: {
      os: 'Android 14',
      ram: '8GB',
      storage: '256GB',
      screen_size: '6.1"',
      camera: '50MP dual camera',
      battery: '3900mAh'
    }
  },
  {
    name: 'EliteBook 840 G8',
    type: 'laptop',
    brand: 'HP',
    model: '840 G8',
    cost_price: 11900,
    list_price: 14500,
    imagePath: '/demo/laptop-sky.svg',
    description: 'Slim office-ready laptop already sold in the sample sales history.',
    specs: {
      processor: 'Intel Core i5 11th Gen',
      ram: '16GB',
      storage: '512GB SSD',
      battery_hours: '7 hrs',
      screen_size: '14"',
      graphics: 'Intel Iris Xe'
    },
    sale: {
      selling_price: 14100,
      sold_at: '2026-03-12 14:30:00',
      buyer_name: 'Chola Tembo'
    }
  },
  {
    name: 'iPhone 13',
    type: 'phone',
    brand: 'Apple',
    model: 'A2633',
    cost_price: 13400,
    list_price: 15900,
    imagePath: '/demo/phone-coral.svg',
    description: 'Popular flagship phone included as a completed sample sale.',
    specs: {
      os: 'iOS 18',
      ram: '4GB',
      storage: '128GB',
      screen_size: '6.1"',
      camera: '12MP dual camera',
      battery: '3240mAh'
    },
    sale: {
      selling_price: 15800,
      sold_at: '2026-03-10 11:05:00',
      buyer_name: 'Ruth Mwanza'
    }
  },
  {
    name: 'Nebula Capsule Mini Projector',
    type: 'other',
    brand: 'Anker',
    model: 'Capsule II',
    cost_price: 5600,
    list_price: 7200,
    imagePath: '/demo/device-wave.svg',
    description: 'Portable projector for quick demos, small events, and team movie nights.',
    other_specs: '720p projector, built-in speaker, HDMI, USB-C charging, remote included'
  },
  {
    name: 'Redmi Note 11',
    type: 'phone',
    brand: 'Xiaomi',
    model: '2201117TG',
    cost_price: 4800,
    list_price: 6200,
    imagePath: '/demo/phone-coral.svg',
    description: 'Archived example used to show deleted gadget history in reports.',
    specs: {
      os: 'Android 13',
      ram: '6GB',
      storage: '128GB',
      screen_size: '6.43"',
      camera: '50MP quad camera',
      battery: '5000mAh'
    },
    deleted_at: '2026-03-09 09:15:00',
    deleted_by: 'mercy.soko'
  }
];

async function demoUserExists(connection, user) {
  const [rows] = await connection.query(
    `
      SELECT id
      FROM users
      WHERE LOWER(username) = LOWER(?)
        OR LOWER(COALESCE(email, '')) = LOWER(?)
      LIMIT 1
    `,
    [user.username, user.email || '']
  );

  return rows.length > 0;
}

async function ensureDemoUsers() {
  await ensureBootstrapAdminUser();

  const connection = await pool.getConnection();
  let createdCount = 0;

  try {
    for (const demoUser of DEMO_USERS) {
      const exists = await demoUserExists(connection, demoUser);
      if (exists) {
        continue;
      }

      const userId = await User.create(
        {
          ...demoUser,
          password_hash: DEMO_PASSWORD_HASH,
          created_by: DEMO_OPERATOR
        },
        connection
      );

      if (demoUser.last_login_at) {
        await connection.query(
          'UPDATE users SET last_login_at = ? WHERE id = ?',
          [demoUser.last_login_at, userId]
        );
      }

      createdCount += 1;
    }
  } finally {
    connection.release();
  }

  if (createdCount > 0) {
    console.log(`Seeded ${createdCount} demo user account(s).`);
  } else {
    console.log('Demo user accounts already present.');
  }
}

async function countInventory(connection) {
  const [rows] = await connection.query('SELECT COUNT(*) AS total FROM gadgets');
  return Number(rows[0]?.total || 0);
}

async function saveSpecs(connection, gadgetId, gadget) {
  if (gadget.type === 'laptop' && gadget.specs) {
    await LaptopSpec.create(gadgetId, gadget.specs, connection);
    return;
  }

  if (gadget.type === 'phone' && gadget.specs) {
    await PhoneSpec.create(gadgetId, gadget.specs, connection);
  }
}

async function insertSale(connection, gadgetId, gadget) {
  if (!gadget.sale) {
    return;
  }

  const profit = Number(gadget.sale.selling_price) - Number(gadget.cost_price);

  await connection.query(
    `
      INSERT INTO sales (gadget_id, selling_price, sold_at, buyer_name, profit)
      VALUES (?, ?, ?, ?, ?)
    `,
    [
      gadgetId,
      gadget.sale.selling_price,
      gadget.sale.sold_at,
      gadget.sale.buyer_name,
      profit
    ]
  );

  await connection.query(
    'UPDATE gadgets SET status = ? WHERE id = ?',
    ['sold', gadgetId]
  );
}

async function markDeleted(connection, gadgetId, gadget) {
  if (!gadget.deleted_at) {
    return;
  }

  await connection.query(
    'UPDATE gadgets SET deleted_at = ?, deleted_by = ? WHERE id = ?',
    [gadget.deleted_at, gadget.deleted_by || DEMO_OPERATOR, gadgetId]
  );
}

async function seedInventory() {
  const connection = await pool.getConnection();
  let transactionStarted = false;

  try {
    const existingInventoryCount = await countInventory(connection);
    if (existingInventoryCount > 0) {
      console.log('Skipping demo gadgets because local inventory data already exists.');
      return;
    }

    await connection.beginTransaction();
    transactionStarted = true;

    for (const gadget of DEMO_GADGETS) {
      const gadgetId = await Gadget.create(
        {
          name: gadget.name,
          type: gadget.type,
          brand: gadget.brand,
          model: gadget.model,
          cost_price: gadget.cost_price,
          list_price: gadget.list_price,
          status: 'available',
          description: gadget.description,
          other_specs: gadget.type === 'other' ? gadget.other_specs : null
        },
        gadget.imagePath,
        connection
      );

      await saveSpecs(connection, gadgetId, gadget);
      await insertSale(connection, gadgetId, gadget);
      await markDeleted(connection, gadgetId, gadget);
    }

    await connection.commit();

    const soldCount = DEMO_GADGETS.filter((gadget) => gadget.sale).length;
    const deletedCount = DEMO_GADGETS.filter((gadget) => gadget.deleted_at).length;
    console.log(
      `Seeded ${DEMO_GADGETS.length} demo gadgets, including ${soldCount} sold item(s) and ${deletedCount} deleted-history record(s).`
    );
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }
    throw error;
  } finally {
    connection.release();
  }
}

async function seedDemoData() {
  try {
    await ensureDemoUsers();
    await seedInventory();
    console.log('Demo seed complete.');
  } finally {
    await pool.end().catch(() => {});
  }
}

seedDemoData().catch((error) => {
  console.error('Demo seed failed.');
  console.error(error.message);
  process.exit(1);
});
