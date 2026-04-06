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
let checkoutState = {
  appliedPromo: null,
  subtotal: 0,
  total: 0,
  discount: 0,
  verifiedMobile: false,
  generatedOTP: null,
  autocomplete: null
};

const checkoutPromos = {
  WELCOME10: { type: "percent", value: 10, msg: "10% OFF applied!" },
  MYESSANTIA20: { type: "percent", value: 20, msg: "20% OFF applied!" },
  SAVE100: { type: "fixed", value: 100, msg: "₹100 OFF applied!" }
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
  if (!topBarContent) return;
  
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
  
  if (mobileMenuToggle && mobileDropdown) {
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

  setupModalListeners();

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
  
  setupCartButtonListener();
}

function setupModalListeners() {
  const closeCart = document.getElementById('close-cart');
  if (closeCart) {
    closeCart.addEventListener('click', function(e) {
      e.preventDefault();
      closeModal('cart-modal');
    });
  }

  const closeProfile = document.getElementById('close-profile');
  if (closeProfile) {
    closeProfile.addEventListener('click', function(e) {
      e.preventDefault();
      closeModal('profile-modal');
    });
  }

  const closeSearch = document.getElementById('close-search');
  if (closeSearch) {
    closeSearch.addEventListener('click', function(e) {
      e.preventDefault();
      closeModal('search-modal');
    });
  }

  const searchInput = document.getElementById('search-products-input');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      renderSearchResults(this.value.trim());
    });
  }

  const checkoutBtn = document.getElementById('checkout-btn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', async function(e) {
      e.preventDefault();

      if (!currentUser) {
        closeModal('cart-modal');
        openProfile();
        return;
      }

      if (cart.length === 0) {
        return;
      }

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
    });
  }
}

// ========== CART BUTTON SETUP (Event Delegation) ==========
function setupCartButtonListener() {
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
  
  if (!button && event) {
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
  window.addToCart(productId, event?.target?.closest('button'));
};

window.buyNow = function(productId) {
  window.addToCart(productId, event?.target?.closest('button'));
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
    if (document.getElementById('cart-modal')) {
      return;
    }
    
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
  if (topBarContent) {
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
  if (valueStripScroll) {
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
async function ensureCheckoutLoaded() {
  if (checkoutLoaded && document.getElementById('checkout-overlay')) return;

  const root = document.getElementById('checkout-modal-root');
  if (!root) return;

  try {
    const response = await fetch('checkout.html');
    const html = await response.text();
    root.innerHTML = html;
    checkoutLoaded = true;
    bindCheckoutEvents();
    loadCheckoutGooglePlaces();
  } catch (error) {
    console.error('Error loading checkout.html:', error);
  }
}

function bindCheckoutEvents() {
  document.getElementById('close-checkout-modal')?.addEventListener('click', closeCheckout);
  document.getElementById('sendOtpBtn')?.addEventListener('click', sendCheckoutOTP);
  document.getElementById('verifyOtpBtn')?.addEventListener('click', verifyCheckoutOTP);
  document.getElementById('continueToPaymentBtn')?.addEventListener('click', showCheckoutPaymentSection);
  document.getElementById('applyPromoBtn')?.addEventListener('click', applyCheckoutPromo);
  document.getElementById('payNowBtn')?.addEventListener('click', payCheckoutNow);

  const otpWrap = document.querySelector('.checkout-otp-grid');
  otpWrap?.addEventListener('input', function(e) {
    if (e.target.classList.contains('otp-digit')) {
      e.target.value = e.target.value.replace(/\D/g, '');
      if (e.target.value) {
        const next = e.target.nextElementSibling;
        if (next) next.focus();
      }
    }
  });

  otpWrap?.addEventListener('keydown', function(e) {
    if (e.key === 'Backspace' && e.target.classList.contains('otp-digit') && !e.target.value) {
      const prev = e.target.previousElementSibling;
      if (prev) prev.focus();
    }
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
  checkoutState.total = 0;
  checkoutState.discount = 0;
  checkoutState.verifiedMobile = false;
  checkoutState.generatedOTP = null;

  const savedUser = currentUser || JSON.parse(localStorage.getItem('MyEssantia_user') || 'null');

  document.getElementById('mobileInput').value = '';
  document.getElementById('fullName').value = savedUser?.name || '';
  document.getElementById('email').value = savedUser?.email || '';
  document.getElementById('addressLine').value = '';
  document.getElementById('landmark').value = '';
  document.getElementById('city').value = '';
  document.getElementById('pincode').value = '';
  document.getElementById('state').value = '';
  document.getElementById('altPhone').value = '';
  document.getElementById('promoCode').value = '';

  document.getElementById('loginMessage').innerHTML = '';
  document.getElementById('detailsMessage').innerHTML = '';
  document.getElementById('promoMessage').innerHTML = '';
  document.getElementById('paymentMessage').innerHTML = '';

  document.getElementById('otpBlock').classList.add('hidden');
  document.getElementById('verifyOtpBtn').classList.add('hidden');
  document.getElementById('sendOtpBtn').classList.remove('hidden');
  document.getElementById('detailsCard').classList.add('hidden');
  document.getElementById('paymentCard').classList.add('hidden');

  document.querySelectorAll('.otp-digit').forEach(input => input.value = '');

  renderCheckoutCart();
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

  checkoutState.total = checkoutState.subtotal - checkoutState.discount;

  document.getElementById('subtotal').textContent = checkoutFormatPrice(checkoutState.subtotal);
  document.getElementById('totalAmount').textContent = checkoutFormatPrice(checkoutState.total);

  const discountRow = document.getElementById('discountRow');
  if (checkoutState.discount > 0) {
    discountRow.classList.remove('hidden');
    document.getElementById('discountAmount').textContent = '-' + checkoutFormatPrice(checkoutState.discount);
  } else {
    discountRow.classList.add('hidden');
  }
}

function setCheckoutStep(step) {
  const config = {
    1: { s1: 'In Progress', s2: 'Pending', s3: 'Pending', p: '18%', active: ['stepLogin'], completed: [] },
    2: { s1: 'Done', s2: 'In Progress', s3: 'Pending', p: '58%', active: ['stepAddress'], completed: ['stepLogin'] },
    3: { s1: 'Done', s2: 'Done', s3: 'In Progress', p: '100%', active: ['stepPayment'], completed: ['stepLogin', 'stepAddress'] }
  };

  const state = config[step];

  ['stepLogin', 'stepAddress', 'stepPayment'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('active', 'completed');
    if (state.active.includes(id)) el.classList.add('active');
    if (state.completed.includes(id)) el.classList.add('completed');
  });

  document.getElementById('stepStatus1').textContent = state.s1;
  document.getElementById('stepStatus2').textContent = state.s2;
  document.getElementById('stepStatus3').textContent = state.s3;
  document.getElementById('progressFill').style.width = state.p;
}

function sendCheckoutOTP() {
  const mobile = document.getElementById('mobileInput').value.trim();
  const msgDiv = document.getElementById('loginMessage');

  if (!/^\d{10}$/.test(mobile)) {
    msgDiv.innerHTML = `<div class="checkout-alert error"><i class="fas fa-circle-exclamation"></i> Enter a valid 10-digit mobile number.</div>`;
    return;
  }

  checkoutState.generatedOTP = '123456';
  document.getElementById('otpBlock').classList.remove('hidden');
  document.getElementById('verifyOtpBtn').classList.remove('hidden');
  document.getElementById('sendOtpBtn').classList.add('hidden');

  const digits = checkoutState.generatedOTP.split('');
  document.querySelectorAll('.otp-digit').forEach((input, index) => {
    input.value = digits[index] || '';
  });

  msgDiv.innerHTML = `<div class="checkout-alert success"><i class="fas fa-check-circle"></i> OTP sent to +91 ${mobile}</div>`;
}

function verifyCheckoutOTP() {
  const enteredOTP = Array.from(document.querySelectorAll('.otp-digit')).map(input => input.value).join('');
  const msgDiv = document.getElementById('loginMessage');

  if (enteredOTP !== checkoutState.generatedOTP) {
    msgDiv.innerHTML = `<div class="checkout-alert error"><i class="fas fa-circle-exclamation"></i> Invalid OTP. Please try again.</div>`;
    return;
  }

  checkoutState.verifiedMobile = true;
  document.getElementById('detailsCard').classList.remove('hidden');
  document.getElementById('paymentCard').classList.add('hidden');
  setCheckoutStep(2);

  msgDiv.innerHTML = `<div class="checkout-alert success"><i class="fas fa-circle-check"></i> Mobile verified successfully. Please enter address and email.</div>`;
}

function validateCheckoutDetails() {
  const name = document.getElementById('fullName').value.trim();
  const email = document.getElementById('email').value.trim();
  const address = document.getElementById('addressLine').value.trim();
  const city = document.getElementById('city').value.trim();
  const pincode = document.getElementById('pincode').value.trim();
  const state = document.getElementById('state').value.trim();

  if (!name || !email || !address || !city || !state || !/^\d{6}$/.test(pincode)) return false;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;

  return true;
}

function showCheckoutPaymentSection() {
  const msgDiv = document.getElementById('detailsMessage');

  if (!checkoutState.verifiedMobile) {
    msgDiv.innerHTML = `<div class="checkout-alert error"><i class="fas fa-circle-exclamation"></i> Please verify mobile number first.</div>`;
    return;
  }

  if (!validateCheckoutDetails()) {
    msgDiv.innerHTML = `<div class="checkout-alert error"><i class="fas fa-circle-exclamation"></i> Fill valid address and email details.</div>`;
    return;
  }

  sessionStorage.setItem('checkout_customer', JSON.stringify({
    name: document.getElementById('fullName').value.trim(),
    email: document.getElementById('email').value.trim(),
    address: document.getElementById('addressLine').value.trim(),
    landmark: document.getElementById('landmark').value.trim(),
    city: document.getElementById('city').value.trim(),
    pincode: document.getElementById('pincode').value.trim(),
    state: document.getElementById('state').value.trim(),
    mobile: document.getElementById('mobileInput').value.trim(),
    altPhone: document.getElementById('altPhone').value.trim()
  }));

  document.getElementById('paymentCard').classList.remove('hidden');
  setCheckoutStep(3);
  msgDiv.innerHTML = `<div class="checkout-alert success"><i class="fas fa-check-circle"></i> Details saved. Continue with payment.</div>`;
}

function applyCheckoutPromo() {
  const code = document.getElementById('promoCode').value.trim().toUpperCase();
  const msgDiv = document.getElementById('promoMessage');

  if (!code) {
    msgDiv.innerHTML = `<div class="checkout-alert error"><i class="fas fa-ticket"></i> Enter a promo code.</div>`;
    return;
  }

  if (!checkoutPromos[code]) {
    checkoutState.appliedPromo = null;
    updateCheckoutTotals();
    msgDiv.innerHTML = `<div class="checkout-alert error"><i class="fas fa-circle-exclamation"></i> Invalid or expired promo code.</div>`;
    return;
  }

  checkoutState.appliedPromo = { code, ...checkoutPromos[code] };
  updateCheckoutTotals();
  document.getElementById('promoCode').value = '';
  msgDiv.innerHTML = `<div class="checkout-alert success"><i class="fas fa-check-circle"></i> ${checkoutPromos[code].msg}</div>`;
}

function payCheckoutNow() {
  const paymentMessage = document.getElementById('paymentMessage');

  if (!checkoutState.verifiedMobile) {
    paymentMessage.innerHTML = `<div class="checkout-alert error"><i class="fas fa-circle-exclamation"></i> Verify mobile number first.</div>`;
    return;
  }

  if (!validateCheckoutDetails()) {
    paymentMessage.innerHTML = `<div class="checkout-alert error"><i class="fas fa-circle-exclamation"></i> Enter valid address and email details first.</div>`;
    return;
  }

  const customer = JSON.parse(sessionStorage.getItem('checkout_customer') || '{}');
  paymentMessage.innerHTML = `<div class="checkout-alert info"><i class="fas fa-lock"></i> Opening Razorpay checkout...</div>`;

  const options = {
    key: "rzp_test_YourKeyHere",
    amount: Math.round(checkoutState.total * 100),
    currency: "INR",
    name: "MyEssantia",
    description: "Checkout Payment",
    image: "https://placehold.co/100x100/dcefe7/1d7a68?text=M",
    handler: async function(response) {
      const orderId = "ESS" + Date.now();
      paymentMessage.innerHTML = `<div class="checkout-alert success"><i class="fas fa-check-circle"></i> Payment successful. Order ID: ${orderId}</div>`;

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
      address: `${customer.address || ""}, ${customer.landmark || ""}, ${customer.city || ""}, ${customer.state || ""} - ${customer.pincode || ""}`
    },
    theme: {
      color: "#1d7a68"
    },
    modal: {
      ondismiss: function() {
        paymentMessage.innerHTML = `<div class="checkout-alert error"><i class="fas fa-circle-exclamation"></i> Payment popup closed.</div>`;
      }
    }
  };

  const rzp = new Razorpay(options);

  rzp.on("payment.failed", function(response) {
    paymentMessage.innerHTML = `<div class="checkout-alert error"><i class="fas fa-circle-exclamation"></i> Payment failed: ${response.error.description}</div>`;
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

  if (place.formatted_address) {
    document.getElementById('addressLine').value = place.formatted_address;
  }

  const data = extractCheckoutAddressData(place);
  if (data.city) document.getElementById('city').value = data.city;
  if (data.state) document.getElementById('state').value = data.state;
  if (data.pincode) document.getElementById('pincode').value = data.pincode;
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
  script.src = 'https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_MAPS_API_KEY&libraries=places&callback=initCheckoutGooglePlaces';
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
