import './style.css'
import { OCRInterface } from './modules/ui/OCRInterface'

// Initialize the OCR interface
const app = document.querySelector<HTMLDivElement>('#app')

if (app) {
  const ocrInterface = new OCRInterface(app)
  ocrInterface.initialize().catch((error) => {
    console.error('Failed to initialize OCR interface:', error)
    app.innerHTML = `
      <div class="error-message">
        <h2>Initialization Error</h2>
        <p>Failed to initialize the application. Please refresh the page.</p>
      </div>
    `
  })

  // Cleanup on page unload
  window.addEventListener('beforeunload', async () => {
    await ocrInterface.cleanup()
  })
} else {
  console.error('App container not found')
}
