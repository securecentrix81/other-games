// secureCentrix.js

export function toggleSecureCentrix(enable) {
  const desktop = document.querySelector("#secure-desktop");

  if (!desktop) return;

  if (enable) {
    desktop.innerHTML = `
      <div style="background:#111;padding:10px;font-size:1.2em;font-weight:bold;">SECURE CENTRIX 81</div>
      <div style="padding:20px">
        <p><button onclick="alert('Launching Virus Clicker…')">virusClicker.exe</button></p>
        <p><button onclick="alert('Running Mineshaft…')">mineshaft.bat</button></p>
        <p>File: <strong>homework.txt</strong> — <span style="color:red">Corrupted</span></p>
        <p><button onclick="window.dispatchEvent(new Event('exitSecureCentrix'))">Exit</button></p>
      </div>
    `;
    desktop.style.display = 'block';
  } else {
    desktop.style.display = 'none';
  }
}
