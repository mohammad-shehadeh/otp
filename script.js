// script.js

document.addEventListener('DOMContentLoaded', () => {
    let currentCategory = null;
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    let slideIndex = 0;
    let slideInterval = null;
    let isSliding = false; // متغير لتتبع حالة الانتقال بين الشرائح

    // عناصر DOM
    const elements = {
        categoriesContainer: document.getElementById('categories-container'),
        productsContainer: document.getElementById('products-container'),
        cartCount: document.getElementById('cart-count'),
        cartModal: document.getElementById('cart-modal'),
        cartItems: document.getElementById('cart-items'),
        cartTotal: document.getElementById('cart-total-price'),
        sendOrderBtn: document.getElementById('send-order-btn'),
        closeCartBtn: document.querySelector('.close'),
        cartButton: document.getElementById('cart-button'),
        slides: document.getElementsByClassName("mySlides"),
        dots: document.getElementsByClassName("dot")
    };

    // وظائف إدارة الواجهة
    const UI = {
        updateAddToCartButtons: () => {
            document.querySelectorAll('.add-to-cart').forEach(button => {
                const productName = button.dataset.id;
                const cartItem = cart.find(item => item.name === productName);
                button.innerHTML = cartItem ? 
                    `<span class="quantity-controls">
                        <button class="decrement">-</button>
                        <span class="quantity">${cartItem.quantity}</span>
                        <button class="increment">+</button>
                    </span>` : 
                    'إضافة للسلة';
                
                if (cartItem) {
                    button.querySelector('.decrement').addEventListener('click', (e) => {
                        e.stopPropagation();
                        Cart.decreaseQuantity(cart.indexOf(cartItem));
                    });
                    
                    button.querySelector('.increment').addEventListener('click', (e) => {
                        e.stopPropagation();
                        Cart.increaseQuantity(cart.indexOf(cartItem));
                    });
                }
            });
        },

        showToast: (message) => {
            const arabicMessages = {
                'added': 'تمت الإضافة إلى السلة',
                'removed': 'تم الحذف من السلة',
                'added to cart': 'تمت الإضافة إلى السلة',
                'removed from cart': 'تم الحذف من السلة'
            };

            const toastMessage = arabicMessages[message.toLowerCase()] || message;
            const toast = document.createElement('div');
            toast.className = 'toast';
            toast.textContent = toastMessage;
            document.body.appendChild(toast);
            
            setTimeout(() => {
                toast.classList.add('show');
                setTimeout(() => {
                    toast.remove();
                }, 3000);
            }, 100);
        },

        createCartItemElement: (item, index) => {
            const li = document.createElement('li');
            li.className = 'cart-item';
            li.innerHTML = `
                <div class="item-image">
                    <img src="${item.image}" alt="${item.name}">
                </div>
                <div class="item-details">
                    <h4>${item.name}</h4>
                    <div class="price-controls">
                        <div class="quantity-controls">
                            <button class="decrement">-</button>
                            <input type="number" value="${item.quantity}" min="1" class="quantity-input">
                            <button class="increment">+</button>
                        </div>
                        <p class="item-total">₪${(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                </div>
                <button class="remove-item">&times;</button>
            `;
            
            li.querySelector('.decrement').addEventListener('click', () => {
                Cart.decreaseQuantity(index);
            });
            
            li.querySelector('.increment').addEventListener('click', () => {
                Cart.increaseQuantity(index);
            });
            
            li.querySelector('.quantity-input').addEventListener('change', (e) => {
                Cart.updateQuantity(index, parseInt(e.target.value));
            });
            
            li.querySelector('.remove-item').addEventListener('click', () => {
                Cart.removeItem(index);
            });
            
            return li;
        }
    };

    // وظائف عربة التسوق
    const Cart = {
        addItem: (product) => {
            const existingItem = cart.find(item => item.name === product.name);
            if (existingItem) {
                existingItem.quantity++;
            } else {
                cart.push({ ...product, quantity: 1 });
            }
            Cart.update();
            UI.showToast(`${product.name} added to cart`);
        },

        removeItem: (index) => {
            const itemName = cart[index].name;
            cart.splice(index, 1);
            Cart.update();
            UI.showToast(`${itemName} removed from cart`);
        },

        increaseQuantity: (index) => {
            cart[index].quantity++;
            Cart.update();
        },

        decreaseQuantity: (index) => {
            if (cart[index].quantity > 1) {
                cart[index].quantity--;
                Cart.update();
            } else {
                Cart.removeItem(index);
            }
        },

        updateQuantity: (index, newQuantity) => {
            newQuantity = Math.max(1, parseInt(newQuantity) || 1);
            cart[index].quantity = newQuantity;
            Cart.update();
        },

        update: () => {
            localStorage.setItem('cart', JSON.stringify(cart));
            elements.cartCount.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
            
            elements.cartItems.innerHTML = '';
            let total = 0;
            
            cart.forEach((item, index) => {
                elements.cartItems.appendChild(UI.createCartItemElement(item, index));
                total += item.price * item.quantity;
            });
            
            elements.cartTotal.textContent = total.toFixed(2);
            UI.updateAddToCartButtons();
        }
    };

    // وظائف المنتجات
    const Products = {
        loadCategories: () => {
            elements.categoriesContainer.innerHTML = '';
            categories.forEach(category => {
                const categoryElement = document.createElement('div');
                categoryElement.className = 'category-card';
                categoryElement.innerHTML = `
                    <img src="${category.image}" alt="${category.name}">
                    <h3>${category.name}</h3>
                `;
                categoryElement.addEventListener('click', () => Products.filterByCategory(category.name));
                elements.categoriesContainer.appendChild(categoryElement);
            });
        },

        filterByCategory: (categoryName) => {
            currentCategory = categoryName;
            Products.loadProducts();
            
            setTimeout(() => {
                const firstProduct = document.querySelector('.product-card:first-child');
                if (firstProduct) {
                    const yOffset = 270;
                    const y = firstProduct.getBoundingClientRect().top + window.pageYOffset - yOffset;
                    
                    window.scrollTo({
                        top: y,
                        behavior: 'smooth'
                    });
                }
            }, 100);
        },

        loadProducts: () => {
            elements.productsContainer.innerHTML = '';
            const filteredProducts = currentCategory
                ? products.filter(p => p.category === currentCategory)
                : products;

            filteredProducts.forEach(product => {
                const salePrice = product.price;
                const originalPrice = product.discountedPrice ?? salePrice;
                const hasDiscount = originalPrice > salePrice;
                const isAvailable = salePrice > 0;
                const buttonText = isAvailable ? '' : 'غير متوفر';
                const buttonClass = isAvailable ? 'add-to-cart' : 'add-to-cart unavailable';

                const productCard = document.createElement('div');
                productCard.className = 'product-card';

                productCard.innerHTML = `
                    ${hasDiscount ? `<div class="discount-label">SALE</div>` : ''}
                    <img src="${product.image}" alt="${product.name}">
                    <h3>${product.name}</h3>
                    <p class="price ${hasDiscount ? 'on-sale' : (isAvailable ? '' : 'unavailable')}"
                       ${isAvailable ? '' : 'data-unavailable="true"'}>
                        ${
                            hasDiscount
                                ? `<span class="original-price">₪${originalPrice.toFixed(2)}</span>
                                   <span class="selling-price">₪${salePrice.toFixed(2)}</span>`
                                : (isAvailable
                                    ? `₪${salePrice.toFixed(2)}`
                                    : 'غير متوفر حالياً'
                                  )
                        }
                    </p>
                    <button class="${buttonClass}"
                            data-id="${product.name}"
                            ${isAvailable ? '' : 'disabled'}>
                        ${buttonText}
                    </button>
                `;

                if (isAvailable) {
                    productCard
                        .querySelector('.add-to-cart')
                        .addEventListener('click', () => Cart.addItem({
                            name: product.name,
                            image: product.image,
                            price: salePrice
                        }));
                }

                elements.productsContainer.appendChild(productCard);
            });

            UI.updateAddToCartButtons();
        }
    };

    // وظائف السلايدر
    const Slider = {
        init: () => {
            if (elements.slides.length > 0) {
                Slider.showSlide(slideIndex);
                Slider.startAutoSlide();
            }
        },

        startAutoSlide: () => {
            clearInterval(slideInterval);
            slideInterval = setInterval(() => {
                if (!isSliding) {
                    Slider.nextSlide();
                }
            }, 3000);
        },

        nextSlide: () => {
            isSliding = true;
            slideIndex = (slideIndex + 1) % elements.slides.length;
            Slider.showSlide(slideIndex);
            setTimeout(() => {
                isSliding = false;
            }, 700); // يتطابق مع مدة الانتقال في CSS
        },

        prevSlide: () => {
            isSliding = true;
            slideIndex = (slideIndex - 1 + elements.slides.length) % elements.slides.length;
            Slider.showSlide(slideIndex);
            setTimeout(() => {
                isSliding = false;
            }, 700);
        },

        showSlide: (index) => {
            for (let i = 0; i < elements.slides.length; i++) {
                elements.slides[i].style.display = "none";
                elements.dots[i].classList.remove("active");
            }
            
            elements.slides[index].style.display = "block";
            elements.dots[index].classList.add("active");
        },

        handleTouch: (startX, endX) => {
            const diffX = startX - endX;
            if (Math.abs(diffX) > 50) {
                clearInterval(slideInterval);
                if (diffX > 0) {
                    Slider.nextSlide();
                } else {
                    Slider.prevSlide();
                }
                Slider.startAutoSlide();
            }
        }
    };

    // أحداث السلة
    elements.cartButton.addEventListener('click', () => {
        elements.cartModal.style.display = 'block';
        clearInterval(slideInterval);
    });

    elements.closeCartBtn.addEventListener('click', () => {
        elements.cartModal.style.display = 'none';
        Slider.startAutoSlide();
    });

    window.addEventListener('click', (e) => {
        if (e.target === elements.cartModal) {
            elements.cartModal.style.display = 'none';
            Slider.startAutoSlide();
        }
    });

    // إرسال الطلب عبر واتساب
    elements.sendOrderBtn.addEventListener('click', () => {
        const now = new Date();
        const date = now.toLocaleDateString('ar-EG');
        const time = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

        const itemsList = cart.map((item, index) => 
            `🔹 *${index + 1}. ${item.name}*\n` +
            `   - الكمية: ${item.quantity}\n` +
            `   - السعر: ₪${item.price.toFixed(2)}\n` +
            `   - الإجمالي: ₪${(item.price * item.quantity).toFixed(2)}`
        ).join('\n\n');

        const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        const message = encodeURIComponent(
            `*⭐ معرض أبو عالية ⭐*\n` +
            `────────────────────────────\n` +
            `🗓️ *التاريخ:* ${date}\n` +
            `⏰ *الوقت:* ${time}\n` +
            `────────────────────────────\n` +
            `*تفاصيل الطلب:*\n\n` +
            `${itemsList}\n\n` +
            `💰 *المجموع الكلي:* ₪${totalAmount.toFixed(2)}\n` +
            `────────────────────────────\n` +
            `*الاسم:* ____________________\n` +
            `*العنوان:* __________________\n` +
            `*طريقة الدفع:* ______________\n` +
            `*ملاحظات:* _________________`
        );

        window.open(`https://wa.me/972569813333?text=${message}`, '_blank');
    });  

    // أحداث السلايدر
    const slider = document.querySelector('.slideshow-container');
    let touchStartX = 0;

    slider.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        clearInterval(slideInterval);
    });

    slider.addEventListener('touchend', (e) => {
        const touchEndX = e.changedTouches[0].clientX;
        Slider.handleTouch(touchStartX, touchEndX);
    });

    // التهيئة الأولية
    Products.loadCategories();
    Cart.update();
    Slider.init();
});

window.addEventListener('load', () => {
    window.scrollTo(0, 0);
});