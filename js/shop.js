// 1. Firebase Konfiqurasiyası
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let currentUser = null;

// Səhifə açılanda məhsulları yüklə
document.addEventListener("DOMContentLoaded", () => {
  loadProducts();
});

// 2. İstifadəçi Girişi və Balans Oxunması
async function loginUser() {
  const usernameInput = document.getElementById("userInput").value.trim().toLowerCase();
  
  if (!usernameInput) {
    alert("Zəhmət olmasa istifadəçi adınızı daxil edin!");
    return;
  }

  const userRef = db.collection("users").doc(usernameInput);
  const doc = await userRef.get();

  if (doc.exists) {
    currentUser = { id: usernameInput, ...doc.data() };
  } else {
    // Yeni istifadəçi yaradılır
    const newUser = { points_balance: 0, created_at: firebase.firestore.FieldValue.serverTimestamp() };
    await userRef.set(newUser);
    currentUser = { id: usernameInput, ...newUser };
  }

  // UI Yenilənməsi
  document.getElementById("displayUsername").innerText = currentUser.id;
  document.getElementById("userPoints").innerText = currentUser.points_balance;
  document.getElementById("loginForm").style.display = "none";
  document.getElementById("balanceDisplay").style.display = "flex";
}

// 3. Firestore-dan Məhsulları Yükləmək
async function loadProducts() {
  const grid = document.getElementById("productsGrid");

  try {
    const snapshot = await db.collection("products").get();
    
    if (snapshot.empty) {
      grid.innerHTML = "<p class='status-msg'>Hələ ki heç bir məhsul əlavə olunmayıb.</p>";
      return;
    }

    grid.innerHTML = "";
    snapshot.forEach(doc => {
      const p = doc.data();
      const pId = doc.id;

      grid.innerHTML += `
        <div class="product-card">
          <img src="${p.image_url || 'https://via.placeholder.com/150'}" alt="${p.title}">
          <h3>${p.title}</h3>
          <div class="price">💰 ${p.price_points} Points</div>
          <button onclick="buyProduct('${pId}', ${p.price_points})">Satın Al</button>
        </div>
      `;
    });
  } catch (error) {
    console.error("Məhsullar yüklənərkən xəta:", error);
    grid.innerHTML = "<p class='status-msg'>Məhsulları yükləmək mümkün olmadı.</p>";
  }
}

// 4. Məhsul Satın Alma Məntiqi
async function buyProduct(productId, price) {
  if (!currentUser) {
    alert("Əvvəlcə yuxarıdan daxil olun!");
    return;
  }

  if (currentUser.points_balance < price) {
    alert("Kifayət qədər Sultan Points-iniz yoxdur! Reklam izləyərək xal qazanın.");
    return;
  }

  const newBalance = currentUser.points_balance - price;

  try {
    // Balansı bazada yeniləyirik
    await db.collection("users").doc(currentUser.id).update({
      points_balance: newBalance
    });

    // Alış tarixçəsinə qeyd əlavə edirik
    await db.collection("purchases").add({
      user_id: currentUser.id,
      product_id: productId,
      purchased_at: firebase.firestore.FieldValue.serverTimestamp()
    });

    currentUser.points_balance = newBalance;
    document.getElementById("userPoints").innerText = newBalance;
    alert("Təbriklər! Məhsul uğurla alındı.");
  } catch (err) {
    console.error("Tranzaksiya xətası:", err);
    alert("Xəta baş verdi, yenidən cəhd edin.");
  }
}

// 5. Offerwall (AdGate) Modal Funksiyaları
function openOfferwall() {
  if (!currentUser) {
    alert("Xal qazanmaq üçün əvvəlcə istifadəçi adınızı daxil edin!");
    return;
  }

  const container = document.getElementById("offerwallContainer");
  // AdGate URL-nizi buraya qoyacaqsınız (s1 parametrində user.id gedir)
  container.innerHTML = `
    <iframe src="https://wall.adgatemedia.com/aff_c?s1=${currentUser.id}" 
            width="100%" 
            height="500px" 
            frameborder="0">
    </iframe>`;

  document.getElementById("offerwallModal").style.display = "block";
}

function closeOfferwall() {
  document.getElementById("offerwallModal").style.display = "none";
}
