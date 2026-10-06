import Link from 'next/link';
import { User, Stethoscope } from 'lucide-react';

export default function LoginRoleSelection() {
  return (
    <div className="flex-1 flex items-center justify-center bg-zinc-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-white">Welcome Back</h2>
          <p className="mt-2 text-sm text-zinc-400">Select your account type to continue</p>
        </div>
        <div className="grid md:grid-cols-2 gap-6 mt-10">
          <Link href="/patient/login" className="group bg-zinc-900 p-8 rounded-3xl shadow-sm border border-zinc-800 hover:border-brand-500 hover:shadow-lg hover:shadow-brand-500/10 transition-all text-center">
            <div className="size-16 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 mx-auto flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <User className="size-8" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Patient Login</h3>
            <p className="text-zinc-400">Access your consultations and medical records.</p>
          </Link>
          
          <Link href="/doctor/login" className="group bg-zinc-900 p-8 rounded-3xl shadow-sm border border-zinc-800 hover:border-teal-500 hover:shadow-lg hover:shadow-teal-500/10 transition-all text-center">
            <div className="size-16 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 mx-auto flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Stethoscope className="size-8" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Doctor Login</h3>
            <p className="text-zinc-400">Review patient cases and provide opinions.</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
