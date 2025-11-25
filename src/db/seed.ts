import { db } from "./connection.ts";
import {
  users,
  categories,
  brands,
  products,
  favorites,
  reviews,
  conversations,
  conversationParticipants,
  messages,
} from "./schema.ts";
import { hashPassword } from "../utils/password.ts";
import * as fs from "fs";
import * as path from "path";

async function seed() {
  console.log("🌱 Starting database seed...\n");

  try {
    // Clear existing data (in correct order due to foreign keys)
    console.log("🗑️  Clearing existing data...");
    await db.delete(messages);
    await db.delete(conversationParticipants);
    await db.delete(conversations);
    await db.delete(reviews);
    await db.delete(favorites);
    await db.delete(products);
    await db.delete(categories);
    await db.delete(brands);
    await db.delete(users);
    console.log("✅ Existing data cleared\n");

    // ==================== USERS ====================
    console.log("👥 Creating users...");
    const hashedPassword = await hashPassword("password123");

    const [user1, user2, user3, user4, user5] = await db
      .insert(users)
      .values([
        {
          email: "marko@example.com",
          password: hashedPassword,
          firstName: "Marko",
          lastName: "Petrović",
          name: "Marko Petrović",
          phone: "+381641234567",
          bio: "Fashion lover from Belgrade. Selling gently used designer items!",
          location: "Beograd",
          verified: true,
          verifiedSeller: true,
          responseTime: "Usually responds within hours",
        },
        {
          email: "ana@example.com",
          password: hashedPassword,
          firstName: "Ana",
          lastName: "Jovanović",
          name: "Ana Jovanović",
          phone: "+381642345678",
          bio: "Vintage clothing enthusiast. All items are authentic!",
          location: "Novi Sad",
          verified: true,
          verifiedSeller: true,
          responseTime: "Usually responds within a day",
        },
        {
          email: "nikola@example.com",
          password: hashedPassword,
          firstName: "Nikola",
          lastName: "Milosavljević",
          name: "Nikola Milosavljević",
          phone: "+381643456789",
          bio: "Streetwear collector. Only high-quality pieces.",
          location: "Niš",
          verified: true,
          verifiedSeller: false,
        },
        {
          email: "jelena@example.com",
          password: hashedPassword,
          firstName: "Jelena",
          lastName: "Stanković",
          name: "Jelena Stanković",
          phone: "+381644567890",
          bio: "Minimalist wardrobe. Selling what I no longer wear.",
          location: "Kragujevac",
          verified: true,
          verifiedSeller: false,
        },
        {
          email: "stefan@example.com",
          password: hashedPassword,
          firstName: "Stefan",
          lastName: "Kovačević",
          name: "Stefan Kovačević",
          location: "Subotica",
          verified: false,
          verifiedSeller: false,
        },
      ])
      .returning();

    console.log(`✅ Created ${5} users\n`);

    // ==================== CATEGORIES ====================
    console.log("📂 Creating categories...");

    const categoryData = [
      { name: "Muškarci - Gornji delovi" },
      { name: "Muškarci - Donji delovi" },
      { name: "Muškarci - Jakne i kaputi" },
      { name: "Muškarci - Kombinezoni" },
      { name: "Muškarci - Odela" },
      { name: "Muškarci - Obuća" },
      { name: "Muškarci - Aksesoari" },
      { name: "Muškarci - Odeća za spavanje" },
      { name: "Muškarci - Donji veš" },
      { name: "Muškarci - Kupaći kostimi" },
      { name: "Muškarci - Kostimi" },
      { name: "Žene - Gornji delovi" },
      { name: "Žene - Donji delovi" },
      { name: "Žene - Haljine" },
      { name: "Žene - Jakne i kaputi" },
      { name: "Žene - Kombinezoni" },
      { name: "Žene - Odela" },
      { name: "Žene - Obuća" },
      { name: "Žene - Aksesoari" },
      { name: "Žene - Odeća za spavanje" },
      { name: "Žene - Donji veš" },
      { name: "Žene - Kupaći kostimi" },
      { name: "Žene - Kostimi" },
      { name: "Deca - Gornji delovi" },
      { name: "Deca - Donji delovi" },
      { name: "Deca - Haljine" },
      { name: "Deca - Jakne i kaputi" },
      { name: "Deca - Kombinezoni" },
      { name: "Deca - Odela" },
      { name: "Deca - Obuća" },
      { name: "Deca - Aksesoari" },
      { name: "Deca - Odeća za spavanje" },
      { name: "Deca - Kupaći kostimi" },
      { name: "Deca - Kostimi" },
      { name: "Deca - Zeke i bodiji" },
      { name: "Deca - Paketi odeće" },
      { name: "Ostalo - Lepota i nega" },
      { name: "Ostalo - Maske za lice" },
      { name: "Ostalo - Kuća" },
      { name: "Ostalo - Tehnološki dodaci" },
      { name: "Ostalo - Fotoaparati i film" },
      { name: "Ostalo - Umetnost" },
      { name: "Ostalo - Knjige i časopisi" },
      { name: "Ostalo - Muzika" },
      { name: "Ostalo - Oprema za proslave" },
      { name: "Ostalo - Sportska oprema" },
      { name: "Ostalo - Igračke" },
      { name: "Ostalo - Kišobrani" },
    ];

    const categoriesResult = await db
      .insert(categories)
      .values(categoryData)
      .returning();

    // Get some categories for test products
    const catJackets = categoriesResult.find(
      (c) => c.name === "Muškarci - Jakne i kaputi"
    )!;
    const catDresses = categoriesResult.find(
      (c) => c.name === "Žene - Haljine"
    )!;
    const catPants = categoriesResult.find(
      (c) => c.name === "Muškarci - Donji delovi"
    )!;
    const catShirts = categoriesResult.find(
      (c) => c.name === "Muškarci - Gornji delovi"
    )!;
    const catShoes = categoriesResult.find(
      (c) => c.name === "Muškarci - Obuća"
    )!;
    const catAccessories = categoriesResult.find(
      (c) => c.name === "Žene - Aksesoari"
    )!;

    console.log(`✅ Created ${categoryData.length} categories\n`);

    // ==================== BRANDS ====================
    console.log("🏷️  Creating brands...");

    // Check if brands.ts file exists
    const brandsFilePath = path.join(process.cwd(), "src", "db", "brands.ts");
    if (fs.existsSync(brandsFilePath)) {
      const brandsFileContent = fs.readFileSync(brandsFilePath, "utf-8");

      // Extract brands array using regex - supports both const and export const
      const brandsMatch = brandsFileContent.match(
        /(?:export\s+)?const\s+brands\s*=\s*\[([\s\S]*?)\];?/
      );
      if (!brandsMatch) {
        throw new Error("Could not parse brands from brands.ts");
      }

      // Parse brand names from the matched content
      const brandNamesRaw = brandsMatch[1]
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.startsWith('"'))
        .map((line) => line.replace(/^"|",?$/g, ""));

      console.log(`Found ${brandNamesRaw.length} brands to import...`);

      // Insert brands in batches for better performance
      const batchSize = 1000;
      let totalInserted = 0;

      for (let i = 0; i < brandNamesRaw.length; i += batchSize) {
        const batch = brandNamesRaw.slice(i, i + batchSize);
        await db.insert(brands).values(batch.map((name) => ({ name })));
        totalInserted += batch.length;
        console.log(
          `  Inserted ${totalInserted}/${brandNamesRaw.length} brands...`
        );
      }

      console.log(`✅ Created ${brandNamesRaw.length} brands\n`);
    } else {
      console.log("⚠️  brands.ts file not found, skipping brands import\n");
    }

    // ==================== PRODUCTS ====================
    console.log("🛍️  Creating products...");
    const productsData = await db
      .insert(products)
      .values([
        // User 1 products (Marko)
        {
          title: "Crna kožna jakna Zara",
          description:
            "Kao nova crna kožna jakna iz Zare. Nošena samo nekoliko puta. Perfektna za prolećnu i jesensku sezonu. Bez oštećenja.",
          price: 5000,
          originalPrice: 8000,
          images: [
            "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800",
            "https://images.unsplash.com/photo-1521223890158-f9f7c3d5d504?w=800",
          ],
          size: "M",
          condition: "very-good",
          brand: "Zara",
          color: "Crna",
          material: "Koža",
          categoryId: catJackets.id,
          location: "Beograd",
          status: "active",
          viewCount: 124,
          favoriteCount: 8,
          sellerId: user1.id,
        },
        {
          title: "H&M letnja haljina",
          description:
            "Šarena letnja haljina. Veličina M, ali se može nositi i kao L. Nošena par puta tokom leta. Veoma lagana i prijatna.",
          price: 1500,
          originalPrice: 3000,
          images: [
            "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800",
          ],
          size: "M",
          condition: "good",
          brand: "H&M",
          color: "Šarena",
          material: "Pamuk",
          categoryId: catDresses.id,
          location: "Beograd",
          status: "active",
          viewCount: 89,
          favoriteCount: 12,
          sellerId: user1.id,
        },
        {
          title: "Nike patike Air Max",
          description:
            "Original Nike Air Max patike u odličnom stanju. Kupljene u Sport Vision, nosio ih možda 10 puta. Veoma udobne.",
          price: 7500,
          originalPrice: 12000,
          images: [
            "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800",
            "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800",
          ],
          size: "L",
          condition: "very-good",
          brand: "Nike",
          color: "Bela/Crna",
          categoryId: catShoes.id,
          location: "Beograd",
          status: "active",
          viewCount: 234,
          favoriteCount: 23,
          sellerId: user1.id,
        },

        // User 2 products (Ana)
        {
          title: "Vintage Levi's farmerke",
          description:
            "Autentične vintage Levi's 501 farmerke iz 90-ih. High-waist, perfektne za trendy izgled. Veličina W28.",
          price: 3500,
          originalPrice: 5000,
          images: [
            "https://images.unsplash.com/photo-1542272604-787c3835535d?w=800",
          ],
          size: "S",
          condition: "good",
          brand: "Levi's",
          color: "Plava",
          material: "Denim",
          categoryId: catPants.id,
          location: "Novi Sad",
          status: "active",
          viewCount: 167,
          favoriteCount: 19,
          sellerId: user2.id,
        },
        {
          title: "Mango bela košulja",
          description:
            "Elegantna bela košulja iz Manga. Idealna za poslovni look ili casual kombinacije. Kao nova.",
          price: 2000,
          images: [
            "https://images.unsplash.com/photo-1624206112431-4b98b89d30f3?w=800",
          ],
          size: "S",
          condition: "new",
          brand: "Mango",
          color: "Bela",
          material: "Pamuk",
          categoryId: catShirts.id,
          location: "Novi Sad",
          status: "active",
          viewCount: 56,
          favoriteCount: 7,
          sellerId: user2.id,
        },
        {
          title: "Zimska perjana jakna The North Face",
          description:
            "Original The North Face perjana jakna. Veoma topla i kvalitetna. Nošena jednu sezonu. Bez oštećenja.",
          price: 12000,
          originalPrice: 20000,
          images: [
            "https://images.unsplash.com/photo-1548126032-079d3e85ad3d?w=800",
          ],
          size: "L",
          condition: "very-good",
          brand: "The North Face",
          color: "Crna",
          material: "Perje",
          categoryId: catJackets.id,
          location: "Novi Sad",
          status: "reserved",
          viewCount: 312,
          favoriteCount: 34,
          sellerId: user2.id,
        },

        // User 3 products (Nikola)
        {
          title: "Supreme hoodie crveni",
          description:
            "Authentic Supreme box logo hoodie. Kupljen na drop-u. Sa originalnom potvrdom. Veličina L.",
          price: 25000,
          originalPrice: 35000,
          images: [
            "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800",
          ],
          size: "L",
          condition: "very-good",
          brand: "Supreme",
          color: "Crvena",
          material: "Pamuk",
          categoryId: catShirts.id,
          location: "Niš",
          status: "active",
          viewCount: 423,
          favoriteCount: 45,
          sellerId: user3.id,
        },
        {
          title: "Adidas Originals trenerka",
          description:
            "Kompletna Adidas trenerka (duks + donji deo). Retro dizajn. Odlično očuvana.",
          price: 6000,
          images: [
            "https://images.unsplash.com/photo-1556906781-9a412961c28c?w=800",
          ],
          size: "M",
          condition: "good",
          brand: "Adidas",
          color: "Crna/Bela",
          material: "Poliester",
          categoryId: catShirts.id,
          location: "Niš",
          status: "active",
          viewCount: 178,
          favoriteCount: 15,
          sellerId: user3.id,
        },

        // User 4 products (Jelena)
        {
          title: "COS minimalistička haljina",
          description:
            "Elegantna crna haljina iz COS-a. Minimalističkog dizajna, idealna za različite prilike. Kao nova.",
          price: 4500,
          originalPrice: 8500,
          images: [
            "https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800",
          ],
          size: "S",
          condition: "new",
          brand: "COS",
          color: "Crna",
          material: "Vuna/Poliester",
          categoryId: catDresses.id,
          location: "Kragujevac",
          status: "active",
          viewCount: 94,
          favoriteCount: 11,
          sellerId: user4.id,
        },
        {
          title: "Kožna torba braon",
          description:
            "Kvalitetna kožna torba u braon boji. Prostrana, sa mnogo pregrada. Perfektna za svakodnevnu upotrebu.",
          price: 3000,
          images: [
            "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800",
          ],
          size: "M",
          condition: "good",
          brand: "No Brand",
          color: "Braon",
          material: "Koža",
          categoryId: catAccessories.id,
          location: "Kragujevac",
          status: "active",
          viewCount: 67,
          favoriteCount: 9,
          sellerId: user4.id,
        },

        // Sold product example
        {
          title: "Prodato: Zara sakо",
          description: "Ovaj artikal je već prodat.",
          price: 4000,
          images: [
            "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800",
          ],
          size: "M",
          condition: "very-good",
          brand: "Zara",
          color: "Siva",
          categoryId: catShirts.id,
          location: "Beograd",
          status: "sold",
          viewCount: 289,
          favoriteCount: 5,
          sellerId: user1.id,
        },
      ])
      .returning();

    console.log(`✅ Created ${productsData.length} products\n`);

    // ==================== FAVORITES ====================
    console.log("❤️  Creating favorites...");
    await db.insert(favorites).values([
      // User 3 favorites products from other users
      { userId: user3.id, productId: productsData[0].id }, // Marko's leather jacket
      { userId: user3.id, productId: productsData[3].id }, // Ana's Levi's
      { userId: user3.id, productId: productsData[8].id }, // Jelena's COS dress

      // User 4 favorites
      { userId: user4.id, productId: productsData[1].id }, // Marko's H&M dress
      { userId: user4.id, productId: productsData[4].id }, // Ana's Mango shirt
      { userId: user4.id, productId: productsData[6].id }, // Nikola's Supreme hoodie

      // User 5 favorites
      { userId: user5.id, productId: productsData[2].id }, // Marko's Nike shoes
      { userId: user5.id, productId: productsData[5].id }, // Ana's North Face jacket
    ]);
    console.log("✅ Created favorites\n");

    // ==================== REVIEWS ====================
    console.log("⭐ Creating reviews...");
    await db.insert(reviews).values([
      // Review for sold product
      {
        productId: productsData[10].id,
        reviewerId: user3.id,
        rating: 5,
        comment:
          "Odličan kvalitet! Baš kao na slikama. Prodavac je bio veoma ljubazan i brza isporuka. Preporučujem!",
        reviewType: "this-item",
        helpful: 12,
        sellerResponseComment:
          "Hvala puno na divnoj recenziji! Uživajte u nošenju! 😊",
        sellerResponseCreatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      },
      {
        productId: productsData[0].id,
        reviewerId: user4.id,
        rating: 5,
        comment:
          "Prelepa jakna, tačno kao što je opisano. Veoma sam zadovoljna kupovinom!",
        reviewType: "appearance",
        helpful: 8,
      },
      {
        productId: productsData[3].id,
        reviewerId: user1.id,
        rating: 4,
        comment:
          "Dobre farmerke, ali malo drugačije boje uživo nego na slici. Svakako solidna kupovina.",
        reviewType: "this-item",
        helpful: 3,
        sellerResponseComment:
          "Hvala na feedback-u! Osvetljenje pri fotografisanju može uticati na boju.",
        sellerResponseCreatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      },
    ]);
    console.log("✅ Created reviews\n");

    // ==================== CONVERSATIONS & MESSAGES ====================
    console.log("💬 Creating conversations and messages...");

    // Conversation 1: User 3 interested in Marko's leather jacket
    const [conv1] = await db
      .insert(conversations)
      .values({
        productId: productsData[0].id,
      })
      .returning();

    await db.insert(conversationParticipants).values([
      { conversationId: conv1.id, userId: user3.id, unreadCount: 0 },
      { conversationId: conv1.id, userId: user1.id, unreadCount: 1 },
    ]);

    await db.insert(messages).values([
      {
        conversationId: conv1.id,
        senderId: user3.id,
        content: "Zdravo! Da li je jakna još dostupna?",
        type: "text",
        read: true,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      },
      {
        conversationId: conv1.id,
        senderId: user1.id,
        content:
          "Zdravo! Da, jakna je dostupna. Možete doći da pogledate ako želite.",
        type: "text",
        read: true,
        createdAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000),
      },
      {
        conversationId: conv1.id,
        senderId: user3.id,
        content: "Super! Može li za 4500 RSD?",
        type: "text",
        read: true,
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
      },
      {
        conversationId: conv1.id,
        senderId: user1.id,
        content:
          "Hm, mogu da spustim na 4800 jer je zaista u odličnom stanju. To je moja finalna cena.",
        type: "text",
        read: false,
        createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 mins ago
      },
    ]);

    // Conversation 2: User 4 asking about Ana's North Face jacket
    const [conv2] = await db
      .insert(conversations)
      .values({
        productId: productsData[5].id,
      })
      .returning();

    await db.insert(conversationParticipants).values([
      { conversationId: conv2.id, userId: user4.id, unreadCount: 0 },
      { conversationId: conv2.id, userId: user2.id, unreadCount: 0 },
    ]);

    await db.insert(messages).values([
      {
        conversationId: conv2.id,
        senderId: user4.id,
        content: "Pozdrav, zanima me jakna. Koliko je topla za našu zimu?",
        type: "text",
        read: true,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      },
      {
        conversationId: conv2.id,
        senderId: user2.id,
        content:
          "Jako topla! Nosila sam je prošle zime i nije mi bilo hladno čak ni pri -10°C.",
        type: "text",
        read: true,
        createdAt: new Date(Date.now() - 23 * 60 * 60 * 1000),
      },
      {
        conversationId: conv2.id,
        senderId: user4.id,
        content:
          "Odlično! Rezervišite mi je molim vas, dolazim sutra da je pogledam.",
        type: "text",
        read: true,
        createdAt: new Date(Date.now() - 22 * 60 * 60 * 1000),
      },
    ]);

    console.log("✅ Created conversations and messages\n");

    console.log("🎉 Database seeded successfully!\n");
    console.log("📊 Summary:");
    console.log(`   - Users: 5`);
    console.log(`   - Categories: 48`);
    console.log(`   - Brands: ${(await db.select().from(brands)).length}`);
    console.log(`   - Products: ${productsData.length}`);
    console.log(`   - Favorites: 8`);
    console.log(`   - Reviews: 3`);
    console.log(`   - Conversations: 2`);
    console.log(`   - Messages: 7\n`);

    console.log("👤 Test User Credentials:");
    console.log("   Email: marko@example.com");
    console.log("   Password: password123\n");
    console.log("   (All users have the same password for testing)\n");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  } finally {
    process.exit(0);
  }
}

// Run seed
seed();
