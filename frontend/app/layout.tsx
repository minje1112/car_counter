import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ReduxProvider } from "@/components/ReduxProvider";
import { ThemeRegistry } from "@/components/ThemeRegistry";
import { AuthProvider } from "@/lib/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Header from "@/components/Header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeRegistry>
          <ReduxProvider>
            <AuthProvider>
              <ProtectedRoute>
                <Header />
                {children}
              </ProtectedRoute>
            </AuthProvider>
          </ReduxProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
}
