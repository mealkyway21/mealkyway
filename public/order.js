// Order Page JavaScript
const API_URL = window.location.origin;

// Hall data for different institutions
const hallData = {
    RU: [
        'শহীদ সৈয়দ নজরুল ইসলাম হল',
        'শহীদ জিয়াউর রহমান হল',
        'মতিহার হল',
        'শাহ মখদুম হল',
        'সৈয়দ আমীর আলী হল',
        'মাদার বক্স হল',
        'কাজী নজরুল ইসলাম হল'
    ],
    RMC: [
        'শহীদ শাহ মাইনুল আহসান চৌধুরী পিংকু ছাত্রাবাস',
        'শহীদ মুক্তিযোদ্ধা কাজী নূরুন্নবী ছাত্রাবাস',
        'শহীদ জামিল আখতার রতন ইন্টার্ন হোস্টেল',
        'Nursing Hostel'
    ]
};

document.addEventListener('DOMContentLoaded', () => {
    const orderForm = document.getElementById('orderForm');
    const contactNumberInput = document.getElementById('contactNumber');
    const nameInput = document.getElementById('name');
    const institutionInput = document.getElementById('institution');
    const hallInput = document.getElementById('hall');
    const roomInput = document.getElementById('room');
    const quantityInput = document.getElementById('quantity');
    const dateInput = document.getElementById('date');
    const totalPriceElement = document.getElementById('totalPrice');
    const formMessage = document.getElementById('formMessage');

    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
    dateInput.min = today;

    // Handle institution selection to populate halls
    institutionInput.addEventListener('change', () => {
        const institution = institutionInput.value;
        hallInput.innerHTML = '<option value="">হল নির্বাচন করুন</option>';
        
        if (institution && hallData[institution]) {
            hallInput.disabled = false;
            hallData[institution].forEach(hall => {
                const option = document.createElement('option');
                option.value = hall;
                option.textContent = hall;
                hallInput.appendChild(option);
            });
        } else {
            hallInput.disabled = true;
            hallInput.innerHTML = '<option value="">প্রথমে প্রতিষ্ঠান নির্বাচন করুন</option>';
        }
    });

    // Update total price when quantity changes
    quantityInput.addEventListener('input', () => {
        const quantity = parseInt(quantityInput.value) || 0;
        const total = quantity * 30;
        totalPriceElement.textContent = total;
    });

    // Auto-fill customer data when contact number is entered
    contactNumberInput.addEventListener('blur', async () => {
        const contactNumber = contactNumberInput.value.trim();
        
        if (contactNumber.length === 11 && contactNumber.startsWith('01')) {
            try {
                const response = await fetch(`${API_URL}/api/customer/${contactNumber}`);
                const data = await response.json();

                if (data.exists && data.customer) {
                    // Auto-fill the form
                    nameInput.value = data.customer.name;
                    
                    // Parse institution and hall from stored hall value (format: "RU - হল নাম")
                    const hallParts = data.customer.hall.split(' - ');
                    if (hallParts.length === 2) {
                        institutionInput.value = hallParts[0];
                        // Trigger institution change to populate halls
                        institutionInput.dispatchEvent(new Event('change'));
                        // Set hall value after halls are populated
                        setTimeout(() => {
                            hallInput.value = hallParts[1];
                        }, 50);
                    }
                    
                    roomInput.value = data.customer.room;
                    
                    showMessage('Welcome back! Your information has been auto-filled. You can edit any field if needed.', 'success');
                } else {
                    // Clear the form
                    nameInput.value = '';
                    institutionInput.value = '';
                    hallInput.value = '';
                    hallInput.disabled = true;
                    hallInput.innerHTML = '<option value="">প্রথমে প্রতিষ্ঠান নির্বাচন করুন</option>';
                    roomInput.value = '';
                }
            } catch (error) {
                console.error('Error fetching customer:', error);
            }
        }
    });

    // Handle form submission
    orderForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Get form data
        const institution = institutionInput.value;
        const hall = hallInput.value;
        const formData = {
            contactNumber: contactNumberInput.value.trim(),
            name: nameInput.value.trim(),
            hall: `${institution} - ${hall}`,
            room: roomInput.value.trim(),
            quantity: parseInt(quantityInput.value),
            date: dateInput.value
        };

        // Validate phone number
        if (!formData.contactNumber.match(/^01[0-9]{9}$/)) {
            showMessage('Please enter a valid 11-digit phone number starting with 01', 'error');
            return;
        }

        // Disable submit button
        const submitBtn = orderForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Processing...</span>';

        try {
            const response = await fetch(`${API_URL}/api/order`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Redirect to confirmation page
                window.location.href = `/confirmation?orderId=${data.orderId}`;
            } else {
                showMessage(data.error || 'Failed to place order. Please try again.', 'error');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        } catch (error) {
            console.error('Error placing order:', error);
            showMessage('Network error. Please check your connection and try again.', 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });

    // Show message helper
    function showMessage(message, type) {
        formMessage.textContent = message;
        formMessage.className = `form-message ${type}`;
        formMessage.style.display = 'block';

        // Auto-hide success messages after 5 seconds
        if (type === 'success') {
            setTimeout(() => {
                formMessage.style.display = 'none';
            }, 5000);
        }
    }
});
