document.addEventListener('DOMContentLoaded', () => {
    const scanBtn = document.getElementById('scanBtn');
    const scannerModal = document.getElementById('scannerModal');
    const closeScannerBtn = document.getElementById('closeScannerBtn');
    const secretInput = document.getElementById('secretInput');

    let html5QrcodeScannerInstance = null;

    if (!scanBtn) return;

    scanBtn.addEventListener('click', () => {
        scannerModal.classList.remove('hidden');
        initializeScannerEngine();
    });

    closeScannerBtn.addEventListener('click', () => {
        terminateScannerEngine();
    });

    function initializeScannerEngine() {
        html5QrcodeScannerInstance = new Html5Qrcode("qrReader");
        
        html5QrcodeScannerInstance.start(
            { facingMode: "environment" },
            {
                fps: 10,
                qrbox: (width, height) => {
                    const dynamicFrameDimension = Math.min(width, height) * 0.7;
                    return { width: dynamicFrameDimension, height: dynamicFrameDimension };
                }
            },
            (decodedText) => {
                if (secretInput) {
                    secretInput.value = decodedText;
                    if (window.globalProcessInputUpdate) {
                        window.globalProcessInputUpdate(decodedText);
                    }
                }
                terminateScannerEngine();
            },
            () => {}
        ).catch(() => {
            terminateScannerEngine();
            alert("Unable to securely initialize physical camera sensor configuration.");
        });
    }

    function terminateScannerEngine() {
        if (html5QrcodeScannerInstance) {
            html5QrcodeScannerInstance.stop().then(() => {
                html5QrcodeScannerInstance = null;
                scannerModal.classList.add('hidden');
            }).catch(() => {
                scannerModal.classList.add('hidden');
            });
        } else {
            scannerModal.classList.add('hidden');
        }
    }
});