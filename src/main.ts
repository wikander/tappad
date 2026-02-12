import './style.css'

// Example: Add content to the app div
const app = document.querySelector<HTMLDivElement>('#app')

if (app) {
  app.innerHTML = `
    <h1>Welcome to Tappad</h1>
    <p>A Vite + TypeScript application</p>
  `
}

// Example: Type-safe DOM manipulation
const message: string = 'Hello from TypeScript!'
console.log(message)
