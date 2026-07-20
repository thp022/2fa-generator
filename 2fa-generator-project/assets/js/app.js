document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('themeToggle');
    const secretInput = document.getElementById('secretInput');
    secretInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\s+/g, '').toUpperCase();
});
    const otpDisplaySection = document.getElementById('otpDisplaySection');
    const otpDigits = document.getElementById('otpDigits');
    const copyBtn = document.getElementById('copyBtn');
    const copyTooltip = document.getElementById('copyTooltip');
    const progressBar = document.getElementById('progressBar');
    const timerCountdown = document.getElementById('timerCountdown');
    const metaDisplay = document.getElementById('metaDisplay');

    let totpInstance = null;
    let refreshInterval = null;

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
        const cleanedValue = value.trim();
        metaDisplay.textContent = "";

        if (!cleanedValue) {
            clearInterval(refreshInterval);
            otpDisplaySection.classList.add('hidden');
            return;
        }

        try {
            let secret = cleanedValue;

            if (cleanedValue.toLowerCase().startsWith('otpauth://')) {
                const parsedUri = OTPAuth.URI.parse(cleanedValue);
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
        secretInput.addEventListener('input', (e) => processInputUpdate(e.target.value));
    }

    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const pureToken = otpDigits.textContent.replace(/\s+/g, '');
            navigator.clipboard.writeText(pureToken).then(() => {
                copyTooltip.textContent = "Copied!";
                setTimeout(() => { copyTooltip.textContent = "Copy"; }, 2000);
            }).catch(() => {
                const fallbackArea = document.createElement('textarea');
                fallbackArea.value = pureToken;
                document.body.appendChild(fallbackArea);
                fallbackArea.select();
                document.execCommand('copy');
                document.body.removeChild(fallbackArea);
                copyTooltip.textContent = "Copied!";
                setTimeout(() => { copyTooltip.textContent = "Copy"; }, 2000);
            });
        });
    }

    window.globalProcessInputUpdate = processInputUpdate;
});
