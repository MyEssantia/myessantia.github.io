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

// ========== CHECKOUT STATE ==========
let checkoutLoaded = false;
let checkoutMapsLoaded = false;
let cartButtonListenerBound = false;
let modalListenersBound = false;

let checkoutState = {
  appliedPromo: null,
  subtotal: 0,
  shipping: 0,
  total: 0,
  discount: 0,
  shippingMethod: "standard",
  autocomplete: null
};

const checkoutPromos = {
  WELCOME10: { type: "percent", value: 10, msg: "10% OFF applied!" },
  MYESSANTIA20: { type: "percent", value: 20, msg: "20% OFF applied!" },
  SAVE100: { type: "fixed", value: 100, msg: "₹100 OFF applied!" }
};

const checkoutShippingOptions = {
  standard: { type: "standard", label: "Standard Shipping", value: 60, eta: "3 - 5 business days" },
  express: { type: "express", label: "Express Shipping", value: 140, eta: "1 - 2 business days" }
};

// ========== LOAD CART FROM LOCALSTORAGE ON INIT ==========
function loadCartFromLocalStorage() {
  try {
    const savedCart = localStorage.getItem('MyEssantia_cart');
    if (savedCart) {
      cart = JSON.parse(savedCart);
      console.log('Cart loaded from localStorage:', cart);
    } else {
      console.log('No cart found in localStorage');
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
    console.log('Cart saved to localStorage:', cart);
  } catch (error) {
    console.error('Error saving cart to localStorage:', error);
  }
}

// Load cart from localStorage immediately when script runs
loadCartFromLocalStorage();

// ========== FIREBASE AUTH STATE OBSERVER ==========
auth.onAuthStateChanged(async (user) => {
  console.log('Auth state changed:', user ? 'Logged in' : 'Logged out');

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

    await loadUserCart(user.uid);
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

function initTopBarScroll() {
  const topBarContent = document.querySelector('.top-bar-scroll-content');
  if (!topBarContent || topBarContent.dataset.initialized === 'true') return;

  topBarContent.dataset.initialized = 'true';
  topBarContent.innerHTML = topBarContent.innerHTML + topBarContent.innerHTML;

  let position = 0;
  const speed = 0.5;

  function scroll() {
    position -= speed;

    if (Math.abs(position) >= topBarContent.scrollWidth / 2) {
      position = 0;
    }

    topBarContent.style.transform = `translateX(${position}px)`;
    requestAnimationFrame(scroll);
  }

  scroll();
}

document.addEventListener('DOMContentLoaded', initTopBarScroll);

// ========== FIREBASE DATA FUNCTIONS ==========
async function loadUserCart(userId) {
  try {
    const cartDoc = await db.collection('carts').doc(userId).get();
    let firebaseCart = [];

    if (cartDoc.exists) {
      firebaseCart = cartDoc.data().items || [];
      console.log('Firebase cart loaded:', firebaseCart);
    }

    if (firebaseCart.length > 0 && cart.length > 0) {
      cart = mergeCarts(cart, firebaseCart);
      console.log('Carts merged:', cart);
    } else if (firebaseCart.length > 0) {
      cart = firebaseCart;
      console.log('Using Firebase cart:', cart);
    }

    saveCartToLocalStorage();
    updateCartCount();
  } catch (error) {
    console.error('Error loading cart:', error);
    updateCartCount();
  }
}

// ========== MERGE CARTS FUNCTION ==========
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
    console.log('Cart saved to Firebase');
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

    console.log('Products loaded:', products.length);
    localStorage.setItem('MyEssantia_products', JSON.stringify(products));
  } catch (error) {
    console.error('Error loading products:', error);
    const cached = localStorage.getItem('MyEssantia_products');
    products = cached ? JSON.parse(cached) : [];
    console.log('Products loaded from cache:', products.length);
  }
}

// ========== UTILITY FUNCTIONS ==========
function formatPrice(price) {
  return Number(price).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

function renderRating(rating) {
  let stars = '';
  for (let i = 1; i <= 5; i++) {
    if (rating >= i) stars += '<i class="fa-solid fa-star"></i>';
    else if (rating > i - 1 && rating < i) stars += '<i class="fa-solid fa-star-half-alt"></i>';
    else stars += '<i class="fa-regular fa-star"></i>';
  }
  return stars + `<span>(${rating.toFixed(1)})</span>`;
}

function getStockStatus(stock) {
  if (stock > 10) return '<span class="stock-badge in-stock">In Stock</span>';
  if (stock > 0) return `<span class="stock-badge low-stock">Only ${stock} left</span>`;
  return '<span class="stock-badge out-of-stock">Out of Stock</span>';
}

function checkoutFormatPrice(price) {
  return "₹" + Number(price).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

function getCheckoutShippingCharge() {
  if (checkoutState.shippingMethod === 'standard') {
    return checkoutState.subtotal > 999 ? 0 : checkoutShippingOptions.standard.value;
  }
  return checkoutShippingOptions.express.value;
}

// ========== FALLBACK COMPONENTS ==========
function getFallbackHeader() {
  return `
    <header style="padding: 1rem; background: #fff; border-bottom: 1px solid #eee;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div class="logo" style="font-family: 'Playfair Display', serif; font-size: 1.8rem;">
          My<span style="color: #d4af37;">Essantia</span>
        </div>
        <div class="header-icons">
          <a href="#" id="search-icon" style="margin: 0 0.5rem;"><i class="fa-solid fa-magnifying-glass"></i></a>
          <a href="#" id="profile-icon" style="margin: 0 0.5rem;"><i class="fa-regular fa-user"></i></a>
          <a href="#" id="cart-icon" style="margin: 0 0.5rem; position: relative;">
            <i class="fa-regular fa-shopping-bag"></i>
            <span id="cart-count" style="position: absolute; top: -8px; right: -8px; background: #d4af37; color: #fff; border-radius: 50%; width: 18px; height: 18px; font-size: 11px; display: flex; align-items: center; justify-content: center;">0</span>
          </a>
        </div>
      </div>
    </header>
  `;
}

function getFallbackFooter() {
  return `
    <footer style="background: #1a1a1a; color: #fff; padding: 2rem 1rem; margin-top: 3rem;">
      <div style="text-align: center;">
        <p>&copy; 2025 MyEssantia. All rights reserved.</p>
      </div>
    </footer>
  `;
}

// ========== COMPONENT LOADING ==========
async function loadComponents() {
  try {
    const headerResponse = await fetch('header.html');
    const headerData = await headerResponse.text();
    document.getElementById('header').innerHTML = headerData;

    const footerResponse = await fetch('footer.html');
    const footerData = await footerResponse.text();
    document.getElementById('footer').innerHTML = footerData;

    await loadProducts();

    setTimeout(() => {
      if (typeof initializeApp === 'function') {
        initializeApp();
      }
      setupEventListeners();
      updateCartCount();
    }, 50);
  } catch (error) {
    console.error('Error loading components:', error);
    document.getElementById('header').innerHTML = getFallbackHeader();
    document.getElementById('footer').innerHTML = getFallbackFooter();

    const cached = localStorage.getItem('MyEssantia_products');
    products = cached ? JSON.parse(cached) : [];

    setTimeout(() => {
      if (typeof initializeApp === 'function') {
        initializeApp();
      }
      setupEventListeners();
      updateCartCount();
    }, 50);
  }
}

// ========== EVENT LISTENERS SETUP ==========
function setupEventListeners() {
  console.log('Setting up event listeners');

  const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
  const mobileDropdown = document.getElementById('mobileDropdown');
  const mobileMenuClose = document.getElementById('mobileMenuClose');

  if (mobileMenuToggle && mobileDropdown && !mobileMenuToggle.dataset.listenerBound) {
    mobileMenuToggle.dataset.listenerBound = 'true';

    mobileMenuToggle.addEventListener('click', function(e) {
      e.stopPropagation();
      this.classList.toggle('active');
      mobileDropdown.classList.toggle('show');

      if (mobileDropdown.classList.contains('show')) {
        document.body.classList.add('menu-open');
        document.body.style.overflow = 'hidden';
      } else {
        document.body.classList.remove('menu-open');
        document.body.style.overflow = '';
      }
    });

    if (mobileMenuClose) {
      mobileMenuClose.addEventListener('click', function() {
        mobileMenuToggle.classList.remove('active');
        mobileDropdown.classList.remove('show');
        document.body.classList.remove('menu-open');
        document.body.style.overflow = '';
      });
    }

    const mobileLinks = document.querySelectorAll('.mobile-menu-link');
    mobileLinks.forEach(link => {
      link.addEventListener('click', () => {
        mobileMenuToggle.classList.remove('active');
        mobileDropdown.classList.remove('show');
        document.body.classList.remove('menu-open');
        document.body.style.overflow = '';
      });
    });

    document.addEventListener('click', function(e) {
      if (mobileDropdown.classList.contains('show')) {
        if (!mobileDropdown.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
          mobileMenuToggle.classList.remove('active');
          mobileDropdown.classList.remove('show');
          document.body.classList.remove('menu-open');
          document.body.style.overflow = '';
        }
      }
    });
  }

  if (!document.body.dataset.globalModalClicksBound) {
    document.body.dataset.globalModalClicksBound = 'true';

    document.addEventListener('click', function(e) {
      const cartIcon = e.target.closest('#cart-icon');
      if (cartIcon) {
        e.preventDefault();
        openCart();

        if (mobileDropdown && mobileDropdown.classList.contains('show')) {
          mobileMenuToggle?.classList.remove('active');
          mobileDropdown.classList.remove('show');
          document.body.classList.remove('menu-open');
          document.body.style.overflow = '';
        }
      }
    });

    document.addEventListener('click', function(e) {
      const profileIcon = e.target.closest('#profile-icon');
      if (profileIcon) {
        e.preventDefault();
        openProfile();

        if (mobileDropdown && mobileDropdown.classList.contains('show')) {
          mobileMenuToggle?.classList.remove('active');
          mobileDropdown.classList.remove('show');
          document.body.classList.remove('menu-open');
          document.body.style.overflow = '';
        }
      }
    });

    document.addEventListener('click', function(e) {
      const searchIcon = e.target.closest('#search-icon');
      if (searchIcon) {
        e.preventDefault();
        openSearch();

        if (mobileDropdown && mobileDropdown.classList.contains('show')) {
          mobileMenuToggle?.classList.remove('active');
          mobileDropdown.classList.remove('show');
          document.body.classList.remove('menu-open');
          document.body.style.overflow = '';
        }
      }
    });

    window.addEventListener('click', function(e) {
      const cartModal = document.getElementById('cart-modal');
      const profileModal = document.getElementById('profile-modal');
      const searchModal = document.getElementById('search-modal');
      const checkoutOverlay = document.getElementById('checkout-overlay');

      if (e.target === cartModal) closeModal('cart-modal');
      if (e.target === profileModal) closeModal('profile-modal');
      if (e.target === searchModal) closeModal('search-modal');
      if (e.target === checkoutOverlay) closeCheckout();
    });

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        if (mobileDropdown && mobileDropdown.classList.contains('show')) {
          mobileMenuToggle?.classList.remove('active');
          mobileDropdown.classList.remove('show');
          document.body.classList.remove('menu-open');
          document.body.style.overflow = '';
        }

        closeModal('cart-modal');
        closeModal('profile-modal');
        closeModal('search-modal');
        closeCheckout();
      }
    });

    window.addEventListener('resize', function() {
      if (window.innerWidth > 768) {
        if (mobileDropdown && mobileDropdown.classList.contains('show')) {
          mobileMenuToggle?.classList.remove('active');
          mobileDropdown.classList.remove('show');
          document.body.classList.remove('menu-open');
          document.body.style.overflow = '';
        }
      }
    });
  }

  setupModalListeners();
  setupCartButtonListener();
}

function setupModalListeners() {
  if (modalListenersBound) return;
  modalListenersBound = true;

  document.addEventListener('click', async function(e) {
    const closeCart = e.target.closest('#close-cart');
    if (closeCart) {
      e.preventDefault();
      closeModal('cart-modal');
      return;
    }

    const closeProfile = e.target.closest('#close-profile');
    if (closeProfile) {
      e.preventDefault();
      closeModal('profile-modal');
      return;
    }

    const closeSearch = e.target.closest('#close-search');
    if (closeSearch) {
      e.preventDefault();
      closeModal('search-modal');
      return;
    }

    const checkoutBtn = e.target.closest('#checkout-btn');
    if (checkoutBtn) {
      e.preventDefault();

      if (!currentUser) {
        closeModal('cart-modal');
        openProfile();
        return;
      }

      if (cart.length === 0) return;

      saveCartToLocalStorage();

      if (currentUser) {
        try {
          await saveCartToFirebase();
        } catch (error) {
          console.error('Error saving cart before checkout:', error);
        }
      }

      closeModal('cart-modal');
      await openCheckout();
    }
  });

  document.addEventListener('input', function(e) {
    if (e.target && e.target.id === 'search-products-input') {
      renderSearchResults(e.target.value.trim());
    }
  });
}

// ========== CART BUTTON SETUP (Event Delegation) ==========
function setupCartButtonListener() {
  if (cartButtonListenerBound) return;
  cartButtonListenerBound = true;

  document.addEventListener('click', function(e) {
    const button = e.target.closest('[data-add-to-cart]');
    if (button) {
      e.preventDefault();
      const productId = button.getAttribute('data-add-to-cart');
      addToCart(productId, button);
    }
  });
}

// ========== MAIN ADD TO CART FUNCTION ==========
window.addToCart = async function(productId, button = null) {
  console.log('Adding to cart:', productId);

  if (!button && typeof event !== 'undefined') {
    button = event.target?.closest('button');
  }

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
    const originalBg = button.style.background;
    const originalColor = button.style.color;

    button.innerHTML = '<i class="fa-solid fa-check"></i> Added!';
    button.style.background = '#4CAF50';
    button.style.color = 'white';

    setTimeout(() => {
      button.innerHTML = originalHTML;
      button.style.background = originalBg;
      button.style.color = originalColor;
      openCart();
    }, 500);
  } else {
    setTimeout(() => openCart(), 300);
  }
};

window.addToCartLegacy = function(productId) {
  window.addToCart(productId, typeof event !== 'undefined' ? event?.target?.closest('button') : null);
};

window.buyNow = function(productId) {
  window.addToCart(productId, typeof event !== 'undefined' ? event?.target?.closest('button') : null);
};

// ========== CART FUNCTIONS ==========
window.updateQuantity = async function(productId, change) {
  const itemIndex = cart.findIndex(item => item.id === productId);
  if (itemIndex === -1) return;

  const product = products.find(p => p.id === productId);
  const item = cart[itemIndex];
  const newQuantity = item.quantity + change;

  if (newQuantity <= 0) {
    cart.splice(itemIndex, 1);
  } else if (product && newQuantity > product.stock) {
    alert('Sorry, not enough stock available!');
    return;
  } else {
    item.quantity = newQuantity;
  }

  saveCartToLocalStorage();

  if (currentUser) {
    await saveCartToFirebase();
  }

  updateCartCount();

  const cartModal = document.getElementById('cart-modal');
  if (cartModal && cartModal.classList.contains('show')) {
    renderCartItems();
  }

  if (document.getElementById('checkout-overlay')?.classList.contains('active')) {
    renderCheckoutCart();
    updateCheckoutTotals();
  }

  if (document.getElementById('search-modal')?.classList.contains('show')) {
    renderSearchResults(document.getElementById('search-products-input')?.value || '');
  }
};

window.removeFromCart = async function(productId) {
  cart = cart.filter(item => item.id !== productId);

  saveCartToLocalStorage();

  if (currentUser) {
    await saveCartToFirebase();
  }

  updateCartCount();

  const cartModal = document.getElementById('cart-modal');
  if (cartModal && cartModal.classList.contains('show')) {
    renderCartItems();
  }

  if (document.getElementById('checkout-overlay')?.classList.contains('active')) {
    renderCheckoutCart();
    updateCheckoutTotals();
  }
};

function renderCartItems() {
  const cartItemsContainer = document.getElementById('cart-items');
  const cartItemCount = document.getElementById('cart-item-count');
  const cartTotalAmount = document.getElementById('cart-total-amount');

  if (!cartItemsContainer) return;

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

  const itemsHtml = cart.map(item => {
    const itemTotal = item.price * item.quantity;
    total += itemTotal;
    totalItems += item.quantity;

    return `
      <div class="cart-item" data-product-id="${item.id}">
        <div class="cart-item-image" style="background-image: url('${item.primaryImg || 'https://via.placeholder.com/90'}');"></div>
        <div class="cart-item-details">
          <h4 class="cart-item-title">${item.title}</h4>
          <div class="cart-item-price">₹${formatPrice(item.price)}</div>
          <div class="cart-item-actions">
            <div class="quantity-controls">
              <button class="quantity-btn decrease-qty" data-product-id="${item.id}">
                <i class="fa-solid fa-minus"></i>
              </button>
              <span class="quantity-value">${item.quantity}</span>
              <button class="quantity-btn increase-qty" data-product-id="${item.id}">
                <i class="fa-solid fa-plus"></i>
              </button>
            </div>
            <button class="remove-btn remove-from-cart" data-product-id="${item.id}">
              <i class="fa-regular fa-trash-can"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  cartItemsContainer.innerHTML = itemsHtml;

  if (cartItemCount) cartItemCount.textContent = totalItems;
  if (cartTotalAmount) cartTotalAmount.textContent = `₹${formatPrice(total)}`;

  attachCartButtonListeners();
}

function attachCartButtonListeners() {
  document.querySelectorAll('.decrease-qty').forEach(button => {
    if (button.dataset.bound === 'true') return;
    button.dataset.bound = 'true';

    button.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      const productId = this.getAttribute('data-product-id');
      if (productId) {
        window.updateQuantity(productId, -1);
      }
    });
  });

  document.querySelectorAll('.increase-qty').forEach(button => {
    if (button.dataset.bound === 'true') return;
    button.dataset.bound = 'true';

    button.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      const productId = this.getAttribute('data-product-id');
      if (productId) {
        window.updateQuantity(productId, 1);
      }
    });
  });

  document.querySelectorAll('.remove-from-cart').forEach(button => {
    if (button.dataset.bound === 'true') return;
    button.dataset.bound = 'true';

    button.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      const productId = this.getAttribute('data-product-id');
      if (productId) {
        window.removeFromCart(productId);
      }
    });
  });
}

function updateCartCount() {
  const cartCount = document.getElementById('cart-count');
  if (cartCount) {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
  }
}

// ========== MODAL FUNCTIONS ==========
function openCart() {
  const cartModal = document.getElementById('cart-modal');

  if (cartModal) {
    renderCartItems();
    cartModal.style.display = 'flex';
    cartModal.classList.add('show');
    document.body.style.overflow = 'hidden';
  } else {
    loadCommonModals().then(() => {
      setTimeout(() => {
        const modal = document.getElementById('cart-modal');
        if (modal) {
          renderCartItems();
          modal.style.display = 'flex';
          modal.classList.add('show');
          document.body.style.overflow = 'hidden';
        }
      }, 100);
    });
  }
}

function openProfile() {
  const profileModal = document.getElementById('profile-modal');
  if (profileModal) {
    renderProfileContent();
    profileModal.classList.add('show');
    document.body.style.overflow = 'hidden';
  } else {
    loadCommonModals().then(() => {
      setTimeout(() => {
        const modal = document.getElementById('profile-modal');
        if (modal) {
          renderProfileContent();
          modal.classList.add('show');
          document.body.style.overflow = 'hidden';
        }
      }, 100);
    });
  }
}

async function openSearch() {
  if (!products.length) {
    await loadProducts();
  }

  const searchModal = document.getElementById('search-modal');
  if (searchModal) {
    searchModal.classList.add('show');
    document.body.style.overflow = 'hidden';
    renderSearchResults('');
    setTimeout(() => {
      document.getElementById('search-products-input')?.focus();
    }, 80);
  } else {
    await loadCommonModals();
    setTimeout(() => {
      document.getElementById('search-modal')?.classList.add('show');
      document.body.style.overflow = 'hidden';
      renderSearchResults('');
      document.getElementById('search-products-input')?.focus();
    }, 100);
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = '';
    modal.classList.remove('show');
    document.body.style.overflow = '';
  }
}

window.openCart = openCart;
window.closeModal = closeModal;

// ========== SEARCH FUNCTIONS ==========
function renderSearchResults(query = '') {
  const results = document.getElementById('search-results');
  if (!results) return;

  const normalized = query.trim().toLowerCase();
  const filtered = products.filter(product => {
    const title = (product.title || '').toLowerCase();
    const category = (product.category || '').toLowerCase();
    return !normalized || title.includes(normalized) || category.includes(normalized);
  });

  if (!filtered.length) {
    results.innerHTML = `
      <div class="search-empty">
        <i class="fa-solid fa-magnifying-glass" style="font-size:1.6rem; margin-bottom:0.75rem;"></i>
        <p>No products found.</p>
      </div>
    `;
    return;
  }

  results.innerHTML = filtered.map(product => `
    <div class="search-product-card">
      <div class="search-product-image" style="background-image:url('${product.primaryImg || (product.images && product.images[0]) || 'https://via.placeholder.com/120'}')"></div>
      <div class="search-product-info">
        <h4>${product.title || 'Untitled Product'}</h4>
        <div class="search-product-meta">${product.category || 'Category'}</div>
        <div class="search-product-price">₹${formatPrice(product.price || 0)}</div>
      </div>
      <div class="search-product-action">
        <button class="search-add-btn" data-add-to-cart="${product.id}">
          <i class="fa-solid fa-bag-shopping"></i> Add to Cart
        </button>
      </div>
    </div>
  `).join('');
}

// ========== LOAD COMMON MODALS ==========
async function loadCommonModals() {
  try {
    if (document.getElementById('cart-modal')) return;

    const response = await fetch('common.html');
    const data = await response.text();
    document.getElementById('common-modals').innerHTML = data;

    setTimeout(() => {
      setupModalListeners();
    }, 100);
  } catch (error) {
    console.error('Error loading modals:', error);
  }
}

// ========== PROFILE FUNCTIONS ==========
function renderProfileContent() {
  const profileContent = document.getElementById('profile-content');
  if (!profileContent) return;

  if (currentUser) {
    profileContent.innerHTML = `
      <div class="profile-card">
        <div class="profile-avatar">
          <img src="${currentUser.picture || 'https://via.placeholder.com/150'}"
               alt="Profile"
               style="width:100%;height:100%;object-fit:cover;"
               onerror="this.src='https://via.placeholder.com/150'">
        </div>

        <div class="profile-name" style="text-align:center;">${currentUser.name}</div>
        <div class="profile-email" style="text-align:center; display:block; width:100%;">${currentUser.email}</div>

        <button class="logout-btn" onclick="window.logout()">
          Logout
        </button>
      </div>
    `;
  } else {
    profileContent.innerHTML = `
      <div class="login-wrapper">
        <div class="login-icon">
          <i class="fa-brands fa-google"></i>
        </div>

        <div class="login-title">
          Welcome to <span style="color:#d4af37;">MyEssantia</span>
        </div>

        <div class="login-subtitle">
          Sign in securely with your Google account
        </div>

        <button class="google-login-btn" onclick="window.loginWithGoogle()">
          <i class="fa-brands fa-google"></i>
          Continue with Google
        </button>

        <div class="login-terms">
          By continuing, you agree to our Terms & Privacy Policy
        </div>
      </div>
    `;
  }
}

window.loginWithGoogle = async function() {
  const provider = new firebase.auth.GoogleAuthProvider();

  try {
    const result = await auth.signInWithPopup(provider);
    const isNewUser = result.additionalUserInfo?.isNewUser;

    if (isNewUser) {
      await db.collection('users').doc(result.user.uid).set({
        name: result.user.displayName,
        email: result.user.email,
        photoURL: result.user.photoURL,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }

    closeModal('profile-modal');
  } catch (error) {
    console.error('Google login error:', error);
    let errorMessage = 'Google login failed. Please try again.';
    if (error.code === 'auth/popup-closed-by-user') {
      errorMessage = 'Login cancelled.';
    } else if (error.code === 'auth/popup-blocked') {
      errorMessage = 'Popup was blocked by your browser.';
    }
    alert(errorMessage);
  }
};

window.logout = async function() {
  try {
    await auth.signOut();
    closeModal('profile-modal');
  } catch (error) {
    console.error('Logout error:', error);
    alert('Failed to logout. Please try again.');
  }
};

function updateProfileIcon() {
  const profileIcon = document.getElementById('profile-icon');
  if (profileIcon) {
    if (currentUser) {
      profileIcon.innerHTML = '<i class="fa-solid fa-circle-user" style="color: #d4af37;"></i>';
    } else {
      profileIcon.innerHTML = '<i class="fa-regular fa-user"></i>';
    }
  }
}

// ===== INFINITE SCROLL STRIPS =====
function initInfiniteScroll() {
  const topBarContent = document.querySelector('.top-bar-scroll-content');
  if (topBarContent && topBarContent.dataset.infiniteScroll !== 'true') {
    topBarContent.dataset.infiniteScroll = 'true';
    const originalHTML = topBarContent.innerHTML;
    topBarContent.innerHTML = originalHTML + originalHTML;

    let position = 0;
    const speed = 0.5;

    function scrollTopBar() {
      position -= speed;
      const originalWidth = topBarContent.scrollWidth / 2;
      if (Math.abs(position) >= originalWidth) {
        position = 0;
      }
      topBarContent.style.transform = `translateX(${position}px)`;
      requestAnimationFrame(scrollTopBar);
    }

    scrollTopBar();
  }

  const valueStripScroll = document.querySelector('.value-strip-scroll');
  if (valueStripScroll && valueStripScroll.dataset.infiniteScroll !== 'true') {
    valueStripScroll.dataset.infiniteScroll = 'true';
    const originalHTML = valueStripScroll.innerHTML;
    valueStripScroll.innerHTML = originalHTML + originalHTML;

    let valuePosition = 0;
    const valueSpeed = 0.5;

    function scrollValueStrip() {
      valuePosition -= valueSpeed;
      const originalWidth = valueStripScroll.scrollWidth / 2;
      if (Math.abs(valuePosition) >= originalWidth) {
        valuePosition = 0;
      }
      valueStripScroll.style.transform = `translateX(${valuePosition}px)`;
      requestAnimationFrame(scrollValueStrip);
    }

    scrollValueStrip();
  }
}

document.addEventListener('DOMContentLoaded', function() {
  setTimeout(initInfiniteScroll, 100);
});

// ========== CHECKOUT DYNAMIC MODAL ==========
function getFallbackCheckoutMarkup() {
  return `
    <div id="checkout-overlay" class="checkout-overlay">
      <div class="checkout-modal">
        <button id="close-checkout-modal" class="checkout-close-btn">
          <i class="fa-solid fa-xmark"></i>
        </button>

        <div class="checkout-header">
          <h2>Checkout</h2>
          <p>Complete your order details</p>
        </div>

        <div class="checkout-progress-wrapper">
          <div class="checkout-progress-bar">
            <div id="progressFill" class="checkout-progress-fill"></div>
          </div>

          <div class="checkout-steps">
            <div id="stepAddress" class="checkout-step active">
              <div class="checkout-step-circle">1</div>
              <div class="checkout-step-content">
                <h4>Delivery Address</h4>
                <span id="stepStatus1">In Progress</span>
              </div>
            </div>

            <div id="stepShippingPayment" class="checkout-step">
              <div class="checkout-step-circle">2</div>
              <div class="checkout-step-content">
                <h4>Shipping & Payment</h4>
                <span id="stepStatus2">Pending</span>
              </div>
            </div>
          </div>
        </div>

        <div class="checkout-body">
          <div class="checkout-left">
            <div id="detailsCard" class="checkout-card">
              <div class="checkout-card-header">
                <h3>Delivery Address</h3>
                <p>Enter your shipping details below.</p>
              </div>

              <div id="detailsMessage"></div>

              <div class="checkout-form-grid">
                <div class="checkout-form-group">
                  <label for="fullName">Full Name</label>
                  <input type="text" id="fullName" placeholder="Enter full name">
                </div>

                <div class="checkout-form-group">
                  <label for="email">Email</label>
                  <input type="email" id="email" placeholder="Enter email">
                </div>

                <div class="checkout-form-group">
                  <label for="mobileInput">Mobile Number</label>
                  <input type="tel" id="mobileInput" maxlength="10" placeholder="Enter mobile number">
                </div>

                <div class="checkout-form-group checkout-form-group-full">
                  <label for="addressLine">Address</label>
                  <input type="text" id="addressLine" placeholder="House no, street, area">
                </div>

                <div class="checkout-form-group">
                  <label for="landmark">Landmark</label>
                  <input type="text" id="landmark" placeholder="Nearby landmark">
                </div>

                <div class="checkout-form-group">
                  <label for="city">City</label>
                  <input type="text" id="city" placeholder="City">
                </div>

                <div class="checkout-form-group">
                  <label for="state">State</label>
                  <input type="text" id="state" placeholder="State">
                </div>

                <div class="checkout-form-group">
                  <label for="pincode">Pincode</label>
                  <input type="text" id="pincode" maxlength="6" placeholder="Pincode">
                </div>
              </div>

              <button id="continueToShippingBtn" class="checkout-primary-btn">Continue</button>
            </div>

            <div id="shippingPaymentCard" class="checkout-card hidden">
              <div class="checkout-card-header">
                <h3>Shipping Method</h3>
                <p>Select delivery speed and complete payment.</p>
              </div>

              <div id="shippingMessage"></div>

              <div class="checkout-shipping-options">
                <label class="checkout-shipping-option active" data-shipping-card="standard">
                  <input type="radio" name="shippingMethod" value="standard" checked>
                  <div>
                    <strong>Standard Shipping</strong>
                    <span>3 - 5 business days</span>
                  </div>
                  <div id="standardShippingPrice">₹60.00</div>
                </label>

                <label class="checkout-shipping-option" data-shipping-card="express">
                  <input type="radio" name="shippingMethod" value="express">
                  <div>
                    <strong>Express Shipping</strong>
                    <span>1 - 2 business days</span>
                  </div>
                  <div>₹140.00</div>
                </label>
              </div>

              <div class="checkout-card-header" style="margin-top: 20px;">
                <h3>Promo Code</h3>
              </div>

              <div class="checkout-promo-row">
                <input type="text" id="promoCode" placeholder="Enter promo code">
                <button id="applyPromoBtn" class="checkout-secondary-btn">Apply</button>
              </div>

              <div id="promoMessage"></div>

              <div class="checkout-card-header" style="margin-top: 20px;">
                <h3>Payment</h3>
                <p>Pay securely with Razorpay.</p>
              </div>

              <div id="paymentMessage"></div>

              <div class="checkout-button-row">
                <button id="backToDetailsBtn" class="checkout-secondary-btn">Back</button>
                <button id="payNowBtn" class="checkout-primary-btn">Pay Now</button>
              </div>
            </div>
          </div>

          <div class="checkout-right">
            <div class="checkout-summary-card">
              <div class="checkout-summary-header">
                <h3>Order Summary</h3>
                <span id="checkoutItemsBadge">0 products</span>
              </div>

              <div id="checkoutCartItemsContainer"></div>

              <div class="checkout-summary-row">
                <span>Subtotal</span>
                <span id="subtotal">₹0.00</span>
              </div>

              <div id="discountRow" class="checkout-summary-row hidden">
                <span>Discount</span>
                <span id="discountAmount">-₹0.00</span>
              </div>

              <div class="checkout-summary-row">
                <span>Shipping</span>
                <span id="shippingAmount">₹0.00</span>
              </div>

              <div id="freeShippingNote" class="checkout-free-note hidden">Standard shipping is free on orders above ₹999.</div>

              <div class="checkout-summary-row total">
                <span>Total</span>
                <span id="totalAmount">₹0.00</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

async function ensureCheckoutLoaded() {
  if (checkoutLoaded && document.getElementById('checkout-overlay')) return;

  const root = document.getElementById('checkout-modal-root');
  if (!root) return;

  try {
    const response = await fetch('checkout.html');
    const html = await response.text();
    root.innerHTML = html;
  } catch (error) {
    console.error('Error loading checkout.html:', error);
    root.innerHTML = getFallbackCheckoutMarkup();
  }

  checkoutLoaded = true;
  bindCheckoutEvents();
  loadCheckoutGooglePlaces();
}

function bindCheckoutEvents() {
  document.getElementById('close-checkout-modal')?.addEventListener('click', closeCheckout);

  document.getElementById('continueToShippingBtn')?.addEventListener('click', showCheckoutShippingSection);

  document.getElementById('backToDetailsBtn')?.addEventListener('click', function() {
    document.getElementById('shippingPaymentCard')?.classList.add('hidden');
    document.getElementById('detailsCard')?.classList.remove('hidden');
    setCheckoutStep(1);
  });

  document.getElementById('applyPromoBtn')?.addEventListener('click', applyCheckoutPromo);
  document.getElementById('payNowBtn')?.addEventListener('click', payCheckoutNow);

  document.querySelectorAll('input[name="shippingMethod"]').forEach(input => {
    input.addEventListener('change', function() {
      checkoutState.shippingMethod = this.value;
      updateCheckoutShippingSelection();
      updateCheckoutTotals();
    });
  });
}

async function openCheckout() {
  await ensureCheckoutLoaded();
  resetCheckout();

  const overlay = document.getElementById('checkout-overlay');
  if (!overlay) return;

  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeCheckout() {
  const overlay = document.getElementById('checkout-overlay');
  if (overlay) {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }
}

window.openCheckout = openCheckout;
window.closeCheckout = closeCheckout;

function resetCheckout() {
  checkoutState.appliedPromo = null;
  checkoutState.subtotal = 0;
  checkoutState.shipping = 0;
  checkoutState.total = 0;
  checkoutState.discount = 0;
  checkoutState.shippingMethod = 'standard';

  const savedUser = currentUser || JSON.parse(localStorage.getItem('MyEssantia_user') || 'null');

  if (document.getElementById('fullName')) document.getElementById('fullName').value = savedUser?.name || '';
  if (document.getElementById('email')) document.getElementById('email').value = savedUser?.email || '';
  if (document.getElementById('mobileInput')) document.getElementById('mobileInput').value = '';
  if (document.getElementById('addressLine')) document.getElementById('addressLine').value = '';
  if (document.getElementById('landmark')) document.getElementById('landmark').value = '';
  if (document.getElementById('city')) document.getElementById('city').value = '';
  if (document.getElementById('pincode')) document.getElementById('pincode').value = '';
  if (document.getElementById('state')) document.getElementById('state').value = '';
  if (document.getElementById('promoCode')) document.getElementById('promoCode').value = '';

  if (document.getElementById('detailsMessage')) document.getElementById('detailsMessage').innerHTML = '';
  if (document.getElementById('shippingMessage')) document.getElementById('shippingMessage').innerHTML = '';
  if (document.getElementById('promoMessage')) document.getElementById('promoMessage').innerHTML = '';
  if (document.getElementById('paymentMessage')) document.getElementById('paymentMessage').innerHTML = '';

  document.getElementById('detailsCard')?.classList.remove('hidden');
  document.getElementById('shippingPaymentCard')?.classList.add('hidden');

  const standardInput = document.querySelector('input[name="shippingMethod"][value="standard"]');
  if (standardInput) standardInput.checked = true;

  renderCheckoutCart();
  updateCheckoutShippingSelection();
  updateCheckoutTotals();
  setCheckoutStep(1);
  initCheckoutAutocomplete();
}

function renderCheckoutCart() {
  const container = document.getElementById('checkoutCartItemsContainer');
  const badge = document.getElementById('checkoutItemsBadge');
  if (!container || !badge) return;

  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  badge.textContent = `${itemCount} product${itemCount > 1 ? 's' : ''}`;

  if (!cart.length) {
    container.innerHTML = `<div class="checkout-alert info"><i class="fas fa-bag-shopping"></i> Your cart is empty.</div>`;
    return;
  }

  container.innerHTML = cart.map(item => `
    <div class="checkout-cart-item">
      <div class="checkout-thumb" style="background-image:url('${item.primaryImg || 'https://via.placeholder.com/200'}')"></div>
      <div>
        <div class="checkout-item-name">${item.title}</div>
        <div class="checkout-item-sub">Qty ${item.quantity}</div>
      </div>
      <div class="checkout-item-price">${checkoutFormatPrice(item.price * item.quantity)}</div>
    </div>
  `).join('');
}

function updateCheckoutTotals() {
  checkoutState.subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  checkoutState.discount = 0;

  if (checkoutState.appliedPromo && checkoutPromos[checkoutState.appliedPromo.code]) {
    const promo = checkoutPromos[checkoutState.appliedPromo.code];
    if (promo.type === 'percent') {
      checkoutState.discount = checkoutState.subtotal * promo.value / 100;
    } else {
      checkoutState.discount = Math.min(promo.value, checkoutState.subtotal);
    }
  }

  checkoutState.shipping = getCheckoutShippingCharge();
  checkoutState.total = checkoutState.subtotal - checkoutState.discount + checkoutState.shipping;

  if (document.getElementById('subtotal')) {
    document.getElementById('subtotal').textContent = checkoutFormatPrice(checkoutState.subtotal);
  }

  if (document.getElementById('shippingAmount')) {
    document.getElementById('shippingAmount').textContent = checkoutState.shipping === 0 ? 'FREE' : checkoutFormatPrice(checkoutState.shipping);
  }

  if (document.getElementById('totalAmount')) {
    document.getElementById('totalAmount').textContent = checkoutFormatPrice(checkoutState.total);
  }

  const discountRow = document.getElementById('discountRow');
  if (discountRow) {
    if (checkoutState.discount > 0) {
      discountRow.classList.remove('hidden');
      document.getElementById('discountAmount').textContent = '-' + checkoutFormatPrice(checkoutState.discount);
    } else {
      discountRow.classList.add('hidden');
    }
  }

  const freeShippingNote = document.getElementById('freeShippingNote');
  if (freeShippingNote) {
    if (checkoutState.shippingMethod === 'standard' && checkoutState.subtotal > 999) {
      freeShippingNote.classList.remove('hidden');
    } else {
      freeShippingNote.classList.add('hidden');
    }
  }

  const standardShippingPrice = document.getElementById('standardShippingPrice');
  if (standardShippingPrice) {
    standardShippingPrice.textContent = checkoutState.subtotal > 999 ? 'FREE' : checkoutFormatPrice(checkoutShippingOptions.standard.value);
  }
}

function setCheckoutStep(step) {
  const config = {
    1: { s1: 'In Progress', s2: 'Pending', p: '50%', active: ['stepAddress'], completed: [] },
    2: { s1: 'Done', s2: 'In Progress', p: '100%', active: ['stepShippingPayment'], completed: ['stepAddress'] }
  };

  const state = config[step];
  if (!state) return;

  ['stepAddress', 'stepShippingPayment'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('active', 'completed');
    if (state.active.includes(id)) el.classList.add('active');
    if (state.completed.includes(id)) el.classList.add('completed');
  });

  if (document.getElementById('stepStatus1')) {
    document.getElementById('stepStatus1').textContent = state.s1;
  }
  if (document.getElementById('stepStatus2')) {
    document.getElementById('stepStatus2').textContent = state.s2;
  }
  if (document.getElementById('progressFill')) {
    document.getElementById('progressFill').style.width = state.p;
  }
}

function validateCheckoutDetails() {
  const name = document.getElementById('fullName')?.value.trim() || '';
  const email = document.getElementById('email')?.value.trim() || '';
  const mobile = document.getElementById('mobileInput')?.value.trim() || '';
  const address = document.getElementById('addressLine')?.value.trim() || '';
  const city = document.getElementById('city')?.value.trim() || '';
  const pincode = document.getElementById('pincode')?.value.trim() || '';
  const state = document.getElementById('state')?.value.trim() || '';

  if (!name || !email || !mobile || !address || !city || !state || !/^\d{6}$/.test(pincode)) return false;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
  if (!/^\d{10}$/.test(mobile)) return false;

  return true;
}

function showCheckoutShippingSection() {
  const msgDiv = document.getElementById('detailsMessage');

  if (!validateCheckoutDetails()) {
    if (msgDiv) {
      msgDiv.innerHTML = `<div class="checkout-alert error"><i class="fas fa-circle-exclamation"></i> Fill valid name, email, mobile number and address details.</div>`;
    }
    return;
  }

  sessionStorage.setItem('checkout_customer', JSON.stringify({
    name: document.getElementById('fullName')?.value.trim() || '',
    email: document.getElementById('email')?.value.trim() || '',
    address: document.getElementById('addressLine')?.value.trim() || '',
    landmark: document.getElementById('landmark')?.value.trim() || '',
    city: document.getElementById('city')?.value.trim() || '',
    pincode: document.getElementById('pincode')?.value.trim() || '',
    state: document.getElementById('state')?.value.trim() || '',
    mobile: document.getElementById('mobileInput')?.value.trim() || ''
  }));

  document.getElementById('detailsCard')?.classList.add('hidden');
  document.getElementById('shippingPaymentCard')?.classList.remove('hidden');
  setCheckoutStep(2);
}

function updateCheckoutShippingSelection() {
  document.querySelectorAll('[data-shipping-card]').forEach(card => {
    const method = card.getAttribute('data-shipping-card');
    card.classList.toggle('active', method === checkoutState.shippingMethod);
  });
}

function applyCheckoutPromo() {
  const code = document.getElementById('promoCode')?.value.trim().toUpperCase() || '';
  const msgDiv = document.getElementById('promoMessage');

  if (!code) {
    if (msgDiv) {
      msgDiv.innerHTML = `<div class="checkout-alert error"><i class="fas fa-ticket"></i> Enter a promo code.</div>`;
    }
    return;
  }

  if (!checkoutPromos[code]) {
    checkoutState.appliedPromo = null;
    updateCheckoutTotals();
    if (msgDiv) {
      msgDiv.innerHTML = `<div class="checkout-alert error"><i class="fas fa-circle-exclamation"></i> Invalid or expired promo code.</div>`;
    }
    return;
  }

  checkoutState.appliedPromo = { code, ...checkoutPromos[code] };
  updateCheckoutTotals();
  if (document.getElementById('promoCode')) {
    document.getElementById('promoCode').value = '';
  }

  if (msgDiv) {
    msgDiv.innerHTML = `<div class="checkout-alert success"><i class="fas fa-check-circle"></i> ${checkoutPromos[code].msg}</div>`;
  }
}

function payCheckoutNow() {
  const paymentMessage = document.getElementById('paymentMessage');

  if (!validateCheckoutDetails()) {
    if (paymentMessage) {
      paymentMessage.innerHTML = `<div class="checkout-alert error"><i class="fas fa-circle-exclamation"></i> Enter valid address and contact details first.</div>`;
    }
    return;
  }

  const customer = JSON.parse(sessionStorage.getItem('checkout_customer') || '{}');

  if (paymentMessage) {
    paymentMessage.innerHTML = `<div class="checkout-alert info"><i class="fas fa-lock"></i> Opening Razorpay checkout...</div>`;
  }

  const options = {
    key: "rzp_test_YourKeyHere",
    amount: Math.round(checkoutState.total * 100),
    currency: "INR",
    name: "MyEssantia",
    description: `Checkout Payment - ${checkoutShippingOptions[checkoutState.shippingMethod].label}`,
    image: "https://placehold.co/100x100/dcefe7/1d7a68?text=M",
    handler: async function(response) {
      const orderId = "ESS" + Date.now();

      if (paymentMessage) {
        paymentMessage.innerHTML = `<div class="checkout-alert success"><i class="fas fa-check-circle"></i> Payment successful. Order ID: ${orderId}</div>`;
      }

      cart = [];
      saveCartToLocalStorage();

      if (currentUser) {
        await saveCartToFirebase();
      }

      updateCartCount();
      renderCartItems();

      setTimeout(() => {
        closeCheckout();
        alert(
          "Order Confirmed!\n\n" +
          "Order ID: " + orderId + "\n" +
          "Amount: " + checkoutFormatPrice(checkoutState.total) + "\n" +
          "Shipping: " + checkoutShippingOptions[checkoutState.shippingMethod].label + "\n" +
          "Payment ID: " + response.razorpay_payment_id + "\n" +
          "Customer: " + customer.name
        );
      }, 800);
    },
    prefill: {
      name: customer.name || "",
      email: customer.email || "",
      contact: customer.mobile || ""
    },
    notes: {
      shipping_method: checkoutShippingOptions[checkoutState.shippingMethod].label,
      address: `${customer.address || ""}, ${customer.landmark || ""}, ${customer.city || ""}, ${customer.state || ""} - ${customer.pincode || ""}`
    },
    theme: {
      color: "#1d7a68"
    },
    modal: {
      ondismiss: function() {
        if (paymentMessage) {
          paymentMessage.innerHTML = `<div class="checkout-alert error"><i class="fas fa-circle-exclamation"></i> Payment popup closed.</div>`;
        }
      }
    }
  };

  const rzp = new Razorpay(options);

  rzp.on("payment.failed", function(response) {
    if (paymentMessage) {
      paymentMessage.innerHTML = `<div class="checkout-alert error"><i class="fas fa-circle-exclamation"></i> Payment failed: ${response.error.description}</div>`;
    }
  });

  rzp.open();
}

function extractCheckoutAddressData(place) {
  const parts = { city: '', state: '', pincode: '' };
  if (!place || !place.address_components) return parts;

  place.address_components.forEach(component => {
    const types = component.types || [];
    if (types.includes('postal_code')) parts.pincode = component.long_name;
    if (types.includes('administrative_area_level_1')) parts.state = component.long_name;
    if (types.includes('locality')) parts.city = component.long_name;
    if (!parts.city && types.includes('postal_town')) parts.city = component.long_name;
    if (!parts.city && types.includes('sublocality_level_1')) parts.city = component.long_name;
    if (!parts.city && types.includes('administrative_area_level_2')) parts.city = component.long_name;
  });

  return parts;
}

function fillCheckoutAddress(place) {
  if (!place) return;

  if (place.formatted_address && document.getElementById('addressLine')) {
    document.getElementById('addressLine').value = place.formatted_address;
  }

  const data = extractCheckoutAddressData(place);
  if (data.city && document.getElementById('city')) document.getElementById('city').value = data.city;
  if (data.state && document.getElementById('state')) document.getElementById('state').value = data.state;
  if (data.pincode && document.getElementById('pincode')) document.getElementById('pincode').value = data.pincode;
}

function initCheckoutAutocomplete() {
  const input = document.getElementById('addressLine');
  if (!input || !window.google || !google.maps || !google.maps.places) return;

  checkoutState.autocomplete = new google.maps.places.Autocomplete(input, {
    types: ['address'],
    componentRestrictions: { country: 'in' },
    fields: ['formatted_address', 'address_components', 'geometry', 'name']
  });

  checkoutState.autocomplete.addListener('place_changed', function() {
    fillCheckoutAddress(checkoutState.autocomplete.getPlace());
  });
}

function loadCheckoutGooglePlaces() {
  if (checkoutMapsLoaded || (window.google && google.maps && google.maps.places)) {
    checkoutMapsLoaded = true;
    initCheckoutAutocomplete();
    return;
  }

  window.initCheckoutGooglePlaces = function() {
    checkoutMapsLoaded = true;
    initCheckoutAutocomplete();
  };

  if (document.querySelector('script[data-checkout-google="true"]')) return;

  const script = document.createElement('script');
script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyD16uGnm1vodkbqGoFSdFdJjGFSLpJmflk&libraries=places&callback=initCheckoutGooglePlaces';
  script.async = true;
  script.defer = true;
  script.dataset.checkoutGoogle = 'true';
  document.body.appendChild(script);
}

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM Content Loaded');

  loadCommonModals().then(() => {
    setupCartButtonListener();
    updateCartCount();
    console.log('Initialization complete');
  });
});

window.addEventListener('load', function() {
  console.log('Window Loaded');

  if (!document.getElementById('cart-modal')) {
    loadCommonModals();
  }

  console.log('Current cart on load:', cart);
});
