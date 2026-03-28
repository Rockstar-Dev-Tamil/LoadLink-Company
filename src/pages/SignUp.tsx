import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LucideMail, LucideLock, LucideEye, LucideEyeOff, LucideUser, LucideMapPin, LucideCheckCircle, LucideArrowRight, LucideLoader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '../stores/authStore';
import { AuthLayout } from '../components/layout/AuthLayout';
import { InputField } from '../components/ui/InputField';

const signUpSchema = z.object({
  name:      z.string().min(2, 'Name must be at least 2 characters').max(60),
  email:     z.string().email('Enter a valid email address'),
  password:  z.string()
               .min(8, 'At least 8 characters')
               .regex(/[A-Z]/, 'Include at least one uppercase letter')
               .regex(/[0-9]/, 'Include at least one number'),
  confirm:   z.string().min(1, 'Please confirm your password'),
  home_city: z.string().optional(),
}).refine(d => d.password === d.confirm, {
  message: 'Passwords do not match',
  path: ['confirm'],
});

type SignUpForm = z.infer<typeof signUpSchema>;

const STRENGTH_CONFIG = [
  { label: '',         color: 'bg-slate-700'   },  // 0
  { label: 'Weak',     color: 'bg-rose-500'    },  // 1
  { label: 'Fair',     color: 'bg-amber-500'   },  // 2
  { label: 'Good',     color: 'bg-sky-500'     },  // 3
  { label: 'Strong',   color: 'bg-emerald-500' },  // 4
];

const getStrength = (pwd: string): number => {
  if (!pwd) return 0;
  let score = 0;
  if (pwd.length >= 8)            score++;
  if (/[A-Z]/.test(pwd))          score++;
  if (/[0-9]/.test(pwd))          score++;
  if (/[^a-zA-Z0-9]/.test(pwd))   score++;
  return score;
};

export default function SignUp() {
  const { signUp } = useAuthStore();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  const { 
    register, 
    handleSubmit, 
    watch,
    formState: { errors, isSubmitting } 
  } = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema)
  });

  const password = watch('password', '');
  const strength = getStrength(password);

  const onSubmit = async (data: SignUpForm) => {
    try {
      await signUp({
        name:      data.name,
        email:     data.email,
        password:  data.password,
        home_city: data.home_city,
      });
      toast.success('Account created! Welcome to LoadLink.');
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Signup failed');
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <AuthLayout 
      title="Create your account" 
      subtitle="Start shipping smarter"
    >
      <motion.form 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        onSubmit={handleSubmit(onSubmit)} 
        className="space-y-6"
      >
        <motion.div variants={itemVariants}>
          <InputField
            label="FULL NAME"
            icon={<LucideUser size={18} />}
            placeholder="John Doe"
            registration={register('name')}
            error={errors.name?.message}
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <InputField
            label="EMAIL ADDRESS"
            icon={<LucideMail size={18} />}
            placeholder="johndoe@company.com"
            registration={register('email')}
            error={errors.email?.message}
          />
        </motion.div>

        <motion.div variants={itemVariants} className="space-y-4">
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

          {/* Password Strength Meter */}
          <div className="px-1">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[9px] font-black tracking-[0.2em] text-[var(--muted)] uppercase">Security Strength</span>
              <span className={`text-[9px] font-black uppercase tracking-widest ${strength > 0 ? 'text-[var(--accent)]' : 'text-[var(--muted)]'}`}>
                {STRENGTH_CONFIG[strength].label}
              </span>
            </div>
            <div className="flex gap-2 h-1.5">
              {[1, 2, 3, 4].map((bar) => (
                <div 
                  key={bar}
                  className={`flex-1 rounded-full transition-all duration-500 bg-[var(--surface-soft)] overflow-hidden border border-[var(--border)]`}
                >
                  <motion.div 
                    initial={false}
                    animate={{ width: bar <= strength ? '100%' : '0%' }}
                    className={`h-full ${STRENGTH_CONFIG[strength].color.replace('bg-', 'bg-')}`}
                    style={{ backgroundColor: bar <= strength ? undefined : 'transparent' }}
                  />
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants}>
          <InputField
            label="CONFIRM PASSWORD"
            type={showConfirm ? 'text' : 'password'}
            icon={<LucideCheckCircle size={18} />}
            placeholder="••••••••"
            registration={register('confirm')}
            error={errors.confirm?.message}
            rightElement={
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="text-[var(--muted)] hover:text-[var(--accent)] transition-colors mr-1"
              >
                {showConfirm ? <LucideEyeOff size={18} /> : <LucideEye size={18} />}
              </button>
            }
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <InputField
            label="HOME CITY (OPTIONAL)"
            icon={<LucideMapPin size={18} />}
            placeholder="e.g. Chennai, Mumbai"
            registration={register('home_city')}
            error={errors.home_city?.message}
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
                <span>CREATING ACCOUNT...</span>
              </>
            ) : (
              <>
                <span>CREATE ACCOUNT</span>
                <LucideArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </motion.div>

        <motion.div variants={itemVariants} className="text-center pt-2">
          <p className="text-[11px] text-[var(--muted)] font-bold mb-4 tracking-tight leading-relaxed">
            BY CREATING AN ACCOUNT, YOU AGREE TO OUR <span className="underline cursor-pointer text-[var(--text)]">TERMS OF SERVICE</span>
          </p>
          <p className="text-[var(--muted)] text-[12px] font-bold tracking-tight">
            ALREADY HAVE AN ACCOUNT?{' '}
            <Link 
              to="/login" 
              className="text-[var(--accent)] hover:text-[var(--accent-bright)] font-black transition-colors ml-1"
            >
              SIGN IN →
            </Link>
          </p>
        </motion.div>
      </motion.form>
    </AuthLayout>
  );
}
