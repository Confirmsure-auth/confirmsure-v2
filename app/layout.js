// 8. Create app/layout.js (Root Layout)
import './globals.css'

export const metadata = {
  title: 'ConfirmSure - Product Authentication',
  description: 'Eliminating counterfeiting through cutting-edge visual verification technology',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
