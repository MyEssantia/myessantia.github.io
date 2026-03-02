// ========== FIREBASE CONFIGURATION ==========
const firebaseConfig = {
  apiKey: "AIzaSyD16uGnm1vodkbqGoFSdFdJjGFSLpJmflk",
  authDomain: "myessantia.firebaseapp.com",
  projectId: "myessantia",
  storageBucket: "myessantia.firebasestorage.app",
  messagingSenderId: "701726517205",
  appId: "1:701726517205:web:f6ab79efdffeab6dbbbf5c",
  measurementId: "G-SZF11SHZBH"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ========== GLOBAL VARIABLES ==========
let cart = [];
let currentUser = null;
let products = [];

// ========== LOAD CART FROM LOCALSTORAGE ON INIT ==========
function loadCartFromLocalStorage() {
  try {
    const savedCart = localStorage.getItem('MyEssantia_cart');
    if (savedCart) {
      cart = JSON.parse(savedCart);
      console.log('Cart loaded from localStorage:', cart);
    }
  } catch (error) {
    console.error('Error loading cart from localStorage:', error);
    cart = [];
  }
}

// ========== SAVE CART TO LOCALSTORAGE ==========
function saveCartToLocalStorage() {
  try {
    localStorage.setItem('MyEssantia_cart', JSON.stringify(cart));
  } catch (error) {
    console.error('Error saving cart to localStorage:', error);
  }
}

// Load cart from localStorage immediately
loadCartFromLocalStorage();

// ========== FIREBASE AUTH STATE OBSERVER ==========
auth.onAuthStateChanged(async (user) => {
  if (user) {
    currentUser = {
      uid: user.uid,
      name: user.displayName || user.email.split('@')[0],
      email: user.email,
      picture: user.photoURL || 'https://via.placeholder.com/80',
      provider: user.providerData[0]?.providerId || 'email',
      memberSince: user.metadata.creationTime
    };
    
    localStorage.setItem('MyEssantia_user', JSON.stringify(currentUser));
    
    // Load user's cart from Firestore and merge with local cart
    await loadUserCart(user.uid);
    
    // Load products from Firestore
    await loadProducts();
    
    updateProfileIcon();
    if (document.getElementById('profile-content')) {
      renderProfileContent();
    }
    
    updateCartCount();
  } else {
    currentUser = null;
    localStorage.removeItem('MyEssantia_user');
    updateProfileIcon();
    if (document.getElementById('profile-content')) {
      renderProfileContent();
    }
  }
});

// ========== FIREBASE DATA FUNCTIONS ==========
async function loadUserCart(userId) {
  try {
    const cartDoc = await db.collection('carts').doc(userId).get();
    let firebaseCart = [];
    
    if (cartDoc.exists) {
      firebaseCart = cartDoc.data().items || [];
    }
    
    if (firebaseCart.length > 0 && cart.length > 0) {
      cart = mergeCarts(cart, firebaseCart);
    } else if (firebaseCart.length > 0) {
      cart = firebaseCart;
    }
    
    saveCartToLocalStorage();
    updateCartCount();
  } catch (error) {
    console.error('Error loading cart:', error);
    updateCartCount();
  }
}

function mergeCarts(localCart, firebaseCart) {
  const merged = [...firebaseCart];
  
  localCart.forEach(localItem => {
    const existingItem = merged.find(item => item.id === localItem.id);
    if (existingItem) {
      existingItem.quantity = Math.max(existingItem.quantity, localItem.quantity);
    } else {
      merged.push(localItem);
    }
  });
  
  return merged;
}

async function saveCartToFirebase() {
  if (!currentUser) return;
  
  try {
    await db.collection('carts').doc(currentUser.uid).set({
      items: cart,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    saveCartToLocalStorage();
  } catch (error) {
    console.error('Error saving cart to Firebase:', error);
    saveCartToLocalStorage();
  }
}

async function loadProducts() {
  try {
    const productsSnapshot = await db.collection('products').get();
    products = productsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    localStorage.setItem('MyEssantia_products', JSON.stringify(products));
  } catch (error) {
    console.error('Error loading products:', error);
    const cached = localStorage.getItem('MyEssantia_products');
    products = cached ? JSON.parse(cached) : [];
  }
}

// ========== UTILITY FUNCTIONS ==========
function formatPrice(price) {
  return price.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

// ========== ADD TO CART FUNCTION ==========
window.addToCart = async function(productId, button = null) {
  console.log('Adding to cart:', productId);
  
  const product = products.find(p => p.id === productId);
  if (!product) {
    console.error('Product not found:', productId);
    return;
  }

  if (product.stock <= 0) {
    alert('Sorry, this product is out of stock!');
    return;
  }

  const existingItem = cart.find(item => item.id === productId);

  if (existingItem) {
    if (existingItem.quantity >= product.stock) {
      alert('Sorry, not enough stock available!');
      return;
    }
    existingItem.quantity += 1;
  } else {
    cart.push({
      id: productId,
      title: product.title,
      category: product.category,
      price: product.price,
      primaryImg: product.primaryImg || (product.images && product.images[0]),
      quantity: 1
    });
  }

  saveCartToLocalStorage();

  if (currentUser) {
    try {
      await saveCartToFirebase();
    } catch (error) {
      console.error('Error saving to Firebase:', error);
    }
  }
  
  updateCartCount();
  
  if (button) {
    const originalHTML = button.innerHTML;
    button.innerHTML = '<i class="fa-solid fa-check"></i> Added!';
    button.style.background = '#4CAF50';
    
    setTimeout(() => {
      button.innerHTML = originalHTML;
      button.style.background = '';
      openCart();
    }, 500);
  } else {
    setTimeout(() => openCart(), 300);
  }
};

// ========== CART FUNCTIONS ==========
window.updateQuantity = async function(productId, change) {
  const itemIndex = cart.findIndex(item => item.id === productId);
  if (itemIndex === -1) return;

  const item = cart[itemIndex];
  const newQuantity = item.quantity + change;

  if (newQuantity <= 0) {
    cart.splice(itemIndex, 1);
  } else {
    item.quantity = newQuantity;
  }

  saveCartToLocalStorage();

  if (currentUser) {
    await saveCartToFirebase();
  }
  
  updateCartCount();
  if (document.getElementById('cart-modal')?.classList.contains('show')) {
    renderCartItems();
  }
};

window.removeFromCart = async function(productId) {
  cart = cart.filter(item => item.id !== productId);
  
  saveCartToLocalStorage();

  if (currentUser) {
    await saveCartToFirebase();
  }
  
  updateCartCount();
  if (document.getElementById('cart-modal')?.classList.contains('show')) {
    renderCartItems();
  }
};

function renderCartItems() {
  const cartItemsContainer = document.getElementById('cart-items');
  const cartItemCount = document.getElementById('cart-item-count');
  const cartTotalAmount = document.getElementById('cart-total-amount');

  console.log('Rendering cart items:', cart);
  console.log('Elements found:', {
    container: !!cartItemsContainer,
    count: !!cartItemCount,
    total: !!cartTotalAmount
  });

  if (!cartItemsContainer) {
    console.error('Cart items container not found!');
    return;
  }

  if (!cart || cart.length === 0) {
    cartItemsContainer.innerHTML = `
      <div class="empty-cart-message">
        <i class="fa-regular fa-cart-shopping"></i>
        <p>Your cart is empty</p>
        <p style="font-size: 0.9rem; margin-top: 0.5rem;">Start shopping to add items!</p>
      </div>
    `;
    if (cartItemCount) cartItemCount.textContent = '0';
    if (cartTotalAmount) cartTotalAmount.textContent = '₹0.00';
    return;
  }

  let total = 0;
  let totalItems = 0;

  cartItemsContainer.innerHTML = cart.map(item => {
    const itemTotal = item.price * item.quantity;
    total += itemTotal;
    totalItems += item.quantity;

    return `
      <div class="cart-item">
        <div class="cart-item-image" style="background-image: url('${item.primaryImg || 'https://via.placeholder.com/90'}');"></div>
        <div class="cart-item-details">
          <h4 class="cart-item-title">${item.title}</h4>
          <div class="cart-item-price">₹${formatPrice(item.price)}</div>
          <div class="cart-item-actions">
            <div class="quantity-controls">
              <button class="quantity-btn" onclick="window.updateQuantity('${item.id}', -1)">
                <i class="fa-solid fa-minus"></i>
              </button>
              <span class="quantity-value">${item.quantity}</span>
              <button class="quantity-btn" onclick="window.updateQuantity('${item.id}', 1)">
                <i class="fa-solid fa-plus"></i>
              </button>
            </div>
            <button class="remove-btn" onclick="window.removeFromCart('${item.id}')">
              <i class="fa-regular fa-trash-can"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  if (cartItemCount) cartItemCount.textContent = totalItems;
  if (cartTotalAmount) cartTotalAmount.textContent = `₹${formatPrice(total)}`;
}

function updateCartCount() {
  const cartCount = document.getElementById('cart-count');
  if (cartCount) {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
    console.log('Cart count updated:', totalItems);
  }
}

// ========== MODAL FUNCTIONS ==========
function openCart() {
  const cartModal = document.getElementById('cart-modal');
  if (cartModal) {
    console.log('Opening cart modal');
    renderCartItems();
    cartModal.classList.add('show');
    document.body.style.overflow = 'hidden';
  } else {
    console.error('Cart modal element not found in DOM!');
    alert('Error: Cart modal not found. Please refresh the page.');
  }
}

function openProfile() {
  const profileModal = document.getElementById('profile-modal');
  if (profileModal) {
    renderProfileContent();
    profileModal.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('show');
    document.body.style.overflow = '';
  }
}

window.openCart = openCart;
window.closeModal = closeModal;

// ========== PROFILE FUNCTIONS ==========
function renderProfileContent() {
  const profileContent = document.getElementById('profile-content');
  if (!profileContent) return;

  if (currentUser) {
    profileContent.innerHTML = `
      <div class="profile-card">
        <div class="profile-avatar">
          <img src="${currentUser.picture || 'https://via.placeholder.com/150'}" alt="Profile">
        </div>
        <div class="profile-name">${currentUser.name}</div>
        <div class="profile-email">${currentUser.email}</div>
        <button class="logout-btn" onclick="window.logout()">Logout</button>
      </div>
    `;
  } else {
    profileContent.innerHTML = `
      <div class="login-wrapper">
        <div class="login-icon"><i class="fa-brands fa-google"></i></div>
        <div class="login-title">Welcome to <span style="color:#d4af37;">MyEssantia</span></div>
        <div class="login-subtitle">Sign in securely with your Google account</div>
        <button class="google-login-btn" onclick="window.loginWithGoogle()">
          <i class="fa-brands fa-google"></i> Continue with Google
        </button>
        <div class="login-terms">By continuing, you agree to our Terms & Privacy Policy</div>
      </div>
    `;
  }
}

window.loginWithGoogle = async function() {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    await auth.signInWithPopup(provider);
    closeModal('profile-modal');
  } catch (error) {
    console.error('Google login error:', error);
    alert('Login failed. Please try again.');
  }
};

window.logout = async function() {
  try {
    await auth.signOut();
    closeModal('profile-modal');
  } catch (error) {
    console.error('Logout error:', error);
  }
};

function updateProfileIcon() {
  const profileIcon = document.getElementById('profile-icon');
  if (profileIcon) {
    profileIcon.innerHTML = currentUser ? 
      '<i class="fa-solid fa-circle-user" style="color: #d4af37;"></i>' : 
      '<i class="fa-regular fa-user"></i>';
  }
}

// ========== EVENT LISTENERS ==========
function setupEventListeners() {
  const closeCart = document.getElementById('close-cart');
  if (closeCart) {
    closeCart.addEventListener('click', () => closeModal('cart-modal'));
  }

  const closeProfile = document.getElementById('close-profile');
  if (closeProfile) {
    closeProfile.addEventListener('click', () => closeModal('profile-modal'));
  }

  const checkoutBtn = document.getElementById('checkout-btn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      if (!currentUser) {
        alert('Please login to checkout');
        closeModal('cart-modal');
        openProfile();
      } else if (cart.length === 0) {
        alert('Your cart is empty!');
      } else {
        window.location.href = 'checkout.html';
      }
    });
  }
}

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded, setting up...');
  setupEventListeners();
  updateCartCount();
  updateProfileIcon();
  
  // Check if modals exist
  console.log('Cart modal exists:', !!document.getElementById('cart-modal'));
  console.log('Profile modal exists:', !!document.getElementById('profile-modal'));
});
