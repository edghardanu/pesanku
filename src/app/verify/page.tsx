import OtpVerificationForm from "@/components/OtpVerificationForm";

export const metadata = {
  title: "Verifikasi Email – Pesanku",
  description: "Verifikasi alamat email Anda melalui kode OTP untuk keamanan akun Pesanku.",
};

export default function VerifyPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-primary/[0.03] via-white to-brand-primary/[0.03] dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 px-4 py-12">
      <OtpVerificationForm />
    </main>
  );
}
