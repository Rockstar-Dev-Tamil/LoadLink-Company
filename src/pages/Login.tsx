import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LucideMail, LucideLock, LucideEye, LucideEyeOff, LucideArrowRight, LucideLoader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '../stores/authStore';
import { AuthLayout } from '../components/layout/AuthLayout';
import { InputField } from '../components/ui/InputField';

const loginSchema = z.object({
  email:    z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const { signIn } = useAuthStore();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  
  const { 
    register, 
    handleSubmit, 
    formState: { errors, isSubmitting } 
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      await signIn(data.email, data.password);
      toast.success('Welcome back!');
      const role = useAuthStore.getState().profile?.role;
      navigate(role === 'driver' ? '/driver' : '/dashboard', { replace: true });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Sign in failed');
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.4
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.98 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { duration: 0.5, ease: "circOut" }
    }
  };

  return (
    <AuthLayout 
      title="Access Dashboard" 
      subtitle="Enter your credentials to continue"
    >
      <motion.form 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        onSubmit={handleSubmit(onSubmit)} 
        className="space-y-10"
      >
        <motion.div variants={itemVariants}>
          <InputField
            label="EMAIL ADDRESS"
            icon={<LucideMail size={20} />}
            placeholder="name@company.com"
            registration={register('email')}
            error={errors.email?.message}
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <InputField
            label="PASSWORD"
            type={showPassword ? 'text' : 'password'}
            icon={<LucideLock size={20} />}
            placeholder="••••••••"
            registration={register('password')}
            error={errors.password?.message}
            rightElement={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[var(--muted)] hover:text-[var(--accent)] transition-all duration-300 transform hover:scale-110 px-2"
              >
                {showPassword ? <LucideEyeOff size={20} /> : <LucideEye size={20} />}
              </button>
            }
          />
          <div className="flex justify-end mt-3">
            <Link to="/forgot-password" title="Forgot Password?" className="text-[10px] font-black text-[var(--muted)] hover:text-[var(--accent)] uppercase tracking-widest transition-colors">
              Recovery Access?
            </Link>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="pt-6">
          <button
            type="submit"
            disabled={isSubmitting}
            className="primary-button group w-full h-[72px] rounded-[1.5rem] relative overflow-hidden transition-all duration-500 active:scale-[0.97]"
          >
             {/* Animated Button Shine */}
             <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
             
            {isSubmitting ? (
              <div className="flex items-center gap-3">
                <LucideLoader2 size={24} className="animate-spin text-white/80" />
                <span className="text-[11px] tracking-[0.3em] font-black uppercase">AUTHENTICATING...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-3 w-full">
                <span className="text-[11px] tracking-[0.3em] font-black uppercase">SIGN IN TO SYSTEM</span>
                <LucideArrowRight size={20} className="group-hover:translate-x-1.5 transition-transform duration-300" />
              </div>
            )}
          </button>
        </motion.div>

        <motion.div variants={itemVariants} className="text-center pt-4">
          <p className="text-[var(--muted)] text-[13px] font-bold tracking-tight">
            NOT REGISTERED YET?{' '}
            <Link 
              to="/signup" 
              className="text-white hover:text-[var(--accent)] font-black transition-all duration-300 ml-2 border-b-2 border-[var(--accent)]/30 hover:border-[var(--accent)]"
            >
              INITIALIZE ACCOUNT →
            </Link>
          </p>
        </motion.div>
      </motion.form>
    </AuthLayout>
  );
}
