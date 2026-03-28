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
        staggerChildren: 0.08
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <AuthLayout 
      title="Welcome back" 
      subtitle="Sign in to your dashboard"
    >
      <motion.form 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        onSubmit={handleSubmit(onSubmit)} 
        className="space-y-8"
      >
        <motion.div variants={itemVariants}>
          <InputField
            label="EMAIL ADDRESS"
            icon={<LucideMail size={18} />}
            placeholder="name@company.com"
            registration={register('email')}
            error={errors.email?.message}
          />
        </motion.div>
...
        <motion.div variants={itemVariants}>
          <InputField
            label="PASSWORD"
            type={showPassword ? 'text' : 'password'}
            icon={<LucideLock size={18} />}
            placeholder="••••••••"
            registration={register('password')}
            error={errors.password?.message}
            rightElement={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[var(--muted)] hover:text-[var(--accent)] transition-colors mr-1"
              >
                {showPassword ? <LucideEyeOff size={18} /> : <LucideEye size={18} />}
              </button>
            }
          />
        </motion.div>

        <motion.div variants={itemVariants} className="pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="primary-button w-full h-16 text-[10px] tracking-[0.2em] font-black uppercase shadow-2xl shadow-[var(--accent)]/30 active:scale-[0.98]"
          >
            {isSubmitting ? (
              <>
                <LucideLoader2 size={20} className="animate-spin" />
                <span>SIGNING IN...</span>
              </>
            ) : (
              <>
                <span>SIGN IN</span>
                <LucideArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </motion.div>

        <motion.div variants={itemVariants} className="text-center pt-2">
          <p className="text-[var(--muted)] text-[12px] font-bold tracking-tight">
            NEW TO LOADLINK?{' '}
            <Link 
              to="/signup" 
              className="text-[var(--accent)] hover:text-[var(--accent-bright)] font-black transition-colors ml-1"
            >
              CREATE ACCOUNT →
            </Link>
          </p>
        </motion.div>
      </motion.form>
    </AuthLayout>
  );
}
