import './globals.css';

export const metadata = {
  title: 'Учёт чеков',
  description: 'Фото чека → распознавание → база → выгрузка для бухгалтера',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
