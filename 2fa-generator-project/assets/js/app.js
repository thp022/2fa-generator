document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('themeToggle');
    const secretInput = document.getElementById('secretInput');
    const pasteBtn = document.getElementById('pasteBtn');
    const toast = document.getElementById('toast');
    const otpDisplaySection = document.getElementById('otpDisplaySection');
    const otpDigits = document.getElementById('otpDigits');
    const copyBtn = document.getElementById('copyBtn');
    const copyTooltip = document.getElementById('copyTooltip');
    const progressBar = document.getElementById('progressBar');
    const timerCountdown = document.getElementById('timerCountdown');
    const metaDisplay = document.getElementById('metaDisplay');

    let totpInstance = null;
    let refreshInterval = null;

    // অডিও নোটিফিকেশন জেনারেটর (Web Audio API)
    function playNotificationSound(type = 'success') {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;

            const audioCtx = new AudioContext();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            oscillator.type = 'sine';

            if (type === 'copy') {
                // কপি করার জন্য কিছুটা হাই-পিচ সাউন্ড
                oscillator.frequency.setValueAtTime(900, audioCtx.currentTime);
                gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
                oscillator.stop(audioCtx.currentTime + 0.12);
            } else {
                // কোড জেনারেট ও পেস্টের জন্য সাউন্ড
                oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
                gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
                oscillator.stop(audioCtx.currentTime + 0.15);
            }

            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            oscillator.start();
        } catch (e) {
            // ব্রাউজারে অডিও ব্লক থাকলে নীরব থাকবে
        }
    }

    // ১. অটো ফোকাস সাপোর্ট
    if (secretInput) {
        secretInput.focus();
    }

    // টোস্ট নোটিফিকেশন প্রদর্শন
    function showToast(message) {
        if (!toast) return;
        toast.textContent = message;
        toast.classList.remove('hidden');
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 2000);
    }

    // ২. পেস্ট বাটন লজিক (অডিওসহ)
    if (pasteBtn && secretInput) {
        pasteBtn.addEventListener('click', async () => {
            try {
                if (navigator.clipboard && navigator.clipboard.readText) {
                    const text = await navigator.clipboard.readText();
                    if (text) {
                        secretInput.value = text;
                        secretInput.dispatchEvent(new Event('input', { bubbles: true }));
                        showToast("Pasted from Clipboard! 📋");
                        playNotificationSound('success');
                        return;
                    }
                }
                throw new Error("Fallback required");
            } catch (err) {
                try {
                    secretInput.focus();
                    const text = await navigator.clipboard.readText();
                    if (text) {
                        secretInput.value = text;
                        secretInput.dispatchEvent(new Event('input', { bubbles: true }));
                        showToast("Pasted from Clipboard! 📋");
                        playNotificationSound('success');
                    } else {
                        showToast("Clipboard is empty!");
                    }
                } catch (fallbackErr) {
                    showToast("Please allow clipboard access or press Ctrl+V");
                }
            }
        });
    }

    const systemDarkTheme = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (!systemDarkTheme) {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
    }

    themeToggle.addEventListener('click', () => {
        if (document.body.classList.contains('dark-theme')) {
            document.body.classList.replace('dark-theme', 'light-theme');
        } else {
            document.body.classList.replace('light-theme', 'dark-theme');
        }
    });

    function processInputUpdate(value) {
        metaDisplay.textContent = "";

        if (!value || !value.trim()) {
            clearInterval(refreshInterval);
            otpDisplaySection.classList.add('hidden');
            return;
        }

        try {
            let secret = value.trim();

            if (!secret.toLowerCase().startsWith('otpauth://')) {
                secret = secret.replace(/\s+/g, '').toUpperCase();
            } else {
                const parsedUri = OTPAuth.URI.parse(secret);
                secret = parsedUri.secret;
                
                if (parsedUri.issuer || parsedUri.label) {
                    const issuer = parsedUri.issuer ? decodeURIComponent(parsedUri.issuer) : '';
                    const label = parsedUri.label ? decodeURIComponent(parsedUri.label) : '';
                    metaDisplay.textContent = `${issuer} ${label ? '(' + label + ')' : ''}`.trim();
                }
            }

            totpInstance = new OTPAuth.TOTP({
                secret: OTPAuth.Secret.fromBase32(secret),
                digits: 6,
                period: 30
            });

            startTokenEngineLoop();
            
            // প্রথমবার সফলভাবে কোড দেখানোর সময় সাউন্ড প্লে হবে
            if (otpDisplaySection.classList.contains('hidden')) {
                playNotificationSound('success');
            }
            
            otpDisplaySection.classList.remove('hidden');

        } catch (error) {
            otpDisplaySection.classList.add('hidden');
            clearInterval(refreshInterval);
        }
    }

    function startTokenEngineLoop() {
        clearInterval(refreshInterval);
        updateTokenDisplayCycle();
        refreshInterval = setInterval(updateTokenDisplayCycle, 1000);
    }

    function updateTokenDisplayCycle() {
        if (!totpInstance) return;

        try {
            const token = totpInstance.generate();
            const formattedToken = `${token.substr(0, 3)} ${token.substr(3, 3)}`;
            otpDigits.textContent = formattedToken;

            const currentSeconds = Math.floor(Date.now() / 1000);
            const relativeRemainder = currentSeconds % 30;
            const absoluteDelta = 30 - relativeRemainder;

            timerCountdown.textContent = absoluteDelta;
            const visualPercent = (absoluteDelta / 30) * 100;
            progressBar.style.width = `${visualPercent}%`;
        } catch (err) {
            clearInterval(refreshInterval);
        }
    }

    if (secretInput) {
        secretInput.addEventListener('input', (e) => {
            let originalValue = e.target.value;
            
            if (!originalValue.toLowerCase().startsWith('otpauth://')) {
                let cleanedInput = originalValue.replace(/\s+/g, '').toUpperCase();
                if (originalValue !== cleanedInput) {
                    e.target.value = cleanedInput;
                }
            }
            
            processInputUpdate(e.target.value);
        });
    }

    // ৩. কপি করার জন্য Toast Notification & Sound
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const pureToken = otpDigits.textContent.replace(/\s+/g, '');
            navigator.clipboard.writeText(pureToken).then(() => {
                if (copyTooltip) copyTooltip.textContent = "Copied!";
                showToast("Copied to Clipboard! 🚀");
                playNotificationSound('copy');
                setTimeout(() => { if (copyTooltip) copyTooltip.textContent = "Copy"; }, 2000);
            }).catch(() => {
                const fallbackArea = document.createElement('textarea');
                fallbackArea.value = pureToken;
                document.body.appendChild(fallbackArea);
                fallbackArea.select();
                document.execCommand('copy');
                document.body.removeChild(fallbackArea);
                if (copyTooltip) copyTooltip.textContent = "Copied!";
                showToast("Copied to Clipboard! 🚀");
                playNotificationSound('copy');
                setTimeout(() => { if (copyTooltip) copyTooltip.textContent = "Copy"; }, 2000);
            });
        });
    }

    window.globalProcessInputUpdate = processInputUpdate;
});
