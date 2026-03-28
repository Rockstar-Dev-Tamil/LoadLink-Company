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
        staggerChildren: 0.08,
        delayChildren: 0.5
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15, scale: 0.98 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { duration: 0.4, ease: "circOut" }
    }
  };

  return (
    <AuthLayout 
      title="Create Account" 
      subtitle="Join the next generation of logistics"
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
            icon={<LucideUser size={20} />}
            placeholder="John Doe"
            registration={register('name')}
            error={errors.name?.message}
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <InputField
            label="EMAIL ADDRESS"
            icon={<LucideMail size={20} />}
            placeholder="johndoe@company.com"
            registration={register('email')}
            error={errors.email?.message}
          />
        </motion.div>

        <motion.div variants={itemVariants} className="space-y-4">
          <InputField
            label="NETWORK PASSWORD"
            type={showPassword ? 'text' : 'password'}
            icon={<LucideLock size={20} />}
            placeholder="••••••••"
            registration={register('password')}
            error={errors.password?.message}
            rightElement={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[var(--muted)] hover:text-[var(--accent)] transition-all transform hover:scale-110 px-2"
              >
                {showPassword ? <LucideEyeOff size={20} /> : <LucideEye size={20} />}
              </button>
            }
          />

          {/* Password Strength Meter */}
          <div className="px-2">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[9px] font-black tracking-[0.3em] text-[var(--muted)] uppercase opacity-60">Security Clearance</span>
              <motion.span 
                key={strength}
                initial={{ opacity: 0, x: 5 }}
                animate={{ opacity: 1, x: 0 }}
                className={`text-[9px] font-black uppercase tracking-widest ${strength > 0 ? 'text-[var(--accent)]' : 'text-[var(--muted)]'}`}
              >
                {STRENGTH_CONFIG[strength].label || 'Scanning...'}
              </motion.span>
            </div>
            <div className="flex gap-2.5 h-1.5">
              {[1, 2, 3, 4].map((bar) => (
                <div 
                  key={bar}
                  className={`flex-1 rounded-full transition-all duration-500 bg-white/[0.03] overflow-hidden border border-white/5`}
                >
                  <motion.div 
                    initial={false}
                    animate={{ 
                      width: bar <= strength ? '100%' : '0%',
                      backgroundColor: bar <= strength ? (STRENGTH_CONFIG[strength].color.includes('rose') ? '#f43f5e' : STRENGTH_CONFIG[strength].color.includes('amber') ? '#f59e0b' : STRENGTH_CONFIG[strength].color.includes('sky') ? '#0ea5e9' : '#10b981') : 'transparent'
                    }}
                    className={`h-full shadow-[0_0_10px_rgba(0,0,0,0.5)]`}
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
            icon={<LucideCheckCircle size={20} />}
            placeholder="••••••••"
            registration={register('confirm')}
            error={errors.confirm?.message}
            rightElement={
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="text-[var(--muted)] hover:text-[var(--accent)] transition-all transform hover:scale-110 px-2"
              >
                {showConfirm ? <LucideEyeOff size={20} /> : <LucideEye size={20} />}
              </button>
            }
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <InputField
            label="HOME CITY (OPTIONAL)"
            icon={<LucideMapPin size={20} />}
            placeholder="e.g. Chennai, Mumbai"
            registration={register('home_city')}
            error={errors.home_city?.message}
          />
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
                <span className="text-[11px] tracking-[0.3em] font-black uppercase">INITIALIZING...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-3 w-full">
                <span className="text-[11px] tracking-[0.3em] font-black uppercase">CREATE SYSTEM ACCOUNT</span>
                <LucideArrowRight size={20} className="group-hover:translate-x-1.5 transition-transform duration-300" />
              </div>
            )}
          </button>
        </motion.div>

        <motion.div variants={itemVariants} className="text-center pt-4">
          <p className="text-[11px] text-[var(--muted)] font-bold mb-6 tracking-tight leading-relaxed opacity-60">
            BY CREATING AN ACCOUNT, YOU AGREE TO OUR <span className="underline cursor-pointer text-white hover:text-[var(--accent)] transition-colors">POLICIES</span>
          </p>
          <p className="text-[var(--muted)] text-[13px] font-bold tracking-tight">
            ALREADY PART OF FLEET?{' '}
            <Link 
              to="/login" 
              className="text-white hover:text-[var(--accent)] font-black transition-all duration-300 ml-2 border-b-2 border-[var(--accent)]/30 hover:border-[var(--accent)]"
            >
              SIGN IN HERE →
            </Link>
          </p>
        </motion.div>
      </motion.form>
    </AuthLayout>
  );
}
