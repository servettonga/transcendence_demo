import { clearSignupForm } from "../components/submit_user_register.js";

export function switchModal(hideModalId, showModalId) {
    const hideModal = document.getElementById(hideModalId);
    const modalToShow = document.getElementById(showModalId)
    const showModal = new bootstrap.Modal(modalToShow);

    // Nasłuchiwanie na zakończenie animacji zamykania
    hideModal.addEventListener("hidden.bs.modal", function () {
        removeBackdrops(); // Usunięcie nadmiarowych backdropów
        document.body.classList.remove("modal-open"); // Reset klasy blokującej scroll

        // Otwórz nowy modal
        showModal.show();
        modalToShow.addEventListener('shown.bs.modal', function () {
            if (showModalId === 'signup_modal')
                clearSignupForm();
        });
    }, { once: true }); // Event nasłuchiwany tylko raz

    // Zamknij obecny modal
    const hideBootstrapModal = bootstrap.Modal.getInstance(hideModal);
    if (hideBootstrapModal) {
        hideBootstrapModal.hide();
    } else {
        console.error("One or both modals not found");
    }
}

// Usunięcie wszystkich nadmiarowych warstw przyciemnienia
function removeBackdrops() {
    document.querySelectorAll(".modal-backdrop").forEach(el => el.remove());
}

window.switchModal = switchModal;
