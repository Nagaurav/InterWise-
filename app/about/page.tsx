import React from 'react';
import Link from 'next/link';
import { Bot, MessageSquareText, FileText, Upload, Mic, BarChart3, CheckCircle2 } from 'lucide-react';
import Button from '@/components/Button';

const features = [
  {
    icon: Bot,
    title: 'AI-Powered Interviews',
    description: 'Practice with an AI interviewer that asks questions tailored to your role and tech stack.',
  },
  {
    icon: MessageSquareText,
    title: 'Personalized Feedback',
    description: 'Get detailed analysis of every answer, covering both technical depth and communication.',
  },
  {
    icon: FileText,
    title: 'Resume-Based Questions',
    description: 'Upload your resume and the interview adapts to your actual experience and projects.',
  },
];

const steps = [
  {
    icon: Upload,
    title: 'Upload Your Resume',
    description: 'Add your resume or fill in the job role and tech stack to customize the interview.',
  },
  {
    icon: Mic,
    title: 'Start the Interview',
    description: 'Answer questions from the AI interviewer at your own pace, whenever suits you.',
  },
  {
    icon: BarChart3,
    title: 'Review Your Results',
    description: 'See your scores, feedback on each answer, and learning resources to improve.',
  },
];

const benefits = [
  'Practice anytime, anywhere',
  'No scheduling required',
  'Unlimited interview attempts',
  'Track your progress over time',
  'Build confidence in your skills',
  'Learn from targeted resources',
];

const SectionHeading = ({ badge, title, subtitle }: { badge: string; title: string; subtitle?: string }) => (
  <div className="flex flex-col items-center gap-4 mb-12 text-center">
    <span className="px-4 py-1.5 text-sm text-white rounded-full border-2 border-[#413239] bg-[#1f1f1f]">
      {badge}
    </span>
    <h2 className="text-4xl font-semibold text-white max-sm:text-3xl">{title}</h2>
    {subtitle && <p className="max-w-2xl text-lg text-[var(--nav-text)]">{subtitle}</p>}
  </div>
);

const AboutPage = () => {
  return (
    <div className="text-white">
      {/* Hero */}
      <section className="flex flex-col items-center gap-6 px-8 pt-16 pb-24 text-center max-sm:pt-8">
        <span className="w-56 py-2 rounded-full border-2 border-[#413239] bg-[#1f1f1f]">
          About Interwise
        </span>
        <h1 className="max-w-4xl text-6xl font-semibold leading-tight text-[var(--nav-text)] max-sm:text-[40px]">
          Your AI Partner for{' '}
          <span className="text-[var(--theme-color)]">Interview Success</span>
        </h1>
        <p className="max-w-2xl text-xl text-[var(--nav-text)] max-sm:text-lg">
          Interwise helps you practice technical interviews with AI, so you walk into the real one prepared and
          confident.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
          <Button href="/interview/new" name="Start Practicing" style={{ fontWeight: 600 }} />
          <Link
            href="/dashboard"
            className="px-8 py-3 font-medium text-white transition-all duration-300 border-2 rounded-full max-sm:px-6 sm:text-xl border-[#413239] hover:border-[var(--theme-color)] hover:bg-[#1f1f1f]"
          >
            View Dashboard
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl px-8 pb-24 mx-auto">
        <SectionHeading
          badge="Features"
          title="Why Choose Interwise?"
          subtitle="Everything you need to prepare for your next technical interview, in one place."
        />
        <div className="grid gap-6 md:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="bg border border-[#352a31] rounded-xl px-6 py-8 transition-colors duration-300 hover:border-[var(--theme-color)]"
            >
              <div className="flex items-center justify-center w-12 h-12 mb-5 rounded-lg bg-[#352a31]/60 border border-[#453841]/60">
                <Icon className="w-6 h-6 text-[var(--theme-hover)]" />
              </div>
              <h3 className="mb-2 text-xl font-bold">{title}</h3>
              <p className="text-gray-400">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl px-8 pb-24 mx-auto">
        <SectionHeading badge="How It Works" title="Three Steps to Get Started" />
        <div className="grid gap-6 md:grid-cols-3">
          {steps.map(({ icon: Icon, title, description }, index) => (
            <div key={title} className="relative bg border border-[#352a31] rounded-xl px-6 py-8">
              <span className="absolute text-5xl font-semibold top-5 right-6 text-[#352a31]">
                0{index + 1}
              </span>
              <div className="flex items-center justify-center w-12 h-12 mb-5 rounded-full bg-[var(--theme-color)]">
                <Icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="mb-2 text-xl font-bold">{title}</h3>
              <p className="text-gray-400">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="max-w-4xl px-8 pb-24 mx-auto">
        <SectionHeading badge="Benefits" title="Practice Without Limits" />
        <ul className="grid gap-4 sm:grid-cols-2">
          {benefits.map((benefit) => (
            <li
              key={benefit}
              className="flex items-center gap-3 px-5 py-4 rounded-xl bg-[#1f1f1f]/70 border border-[#352a31]"
            >
              <CheckCircle2 className="flex-shrink-0 w-5 h-5 text-[var(--theme-hover)]" />
              <span className="text-gray-200">{benefit}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* CTA */}
      <section className="max-w-4xl px-8 pb-24 mx-auto">
        <div className="relative overflow-hidden text-center bg border border-[#352a31] rounded-2xl px-8 py-16 max-sm:py-10">
          <div className="absolute w-72 h-72 rounded-full -top-36 left-1/2 -translate-x-1/2 bg-[var(--theme-color)]/20 blur-3xl pointer-events-none" />
          <h2 className="relative mb-4 text-4xl font-semibold max-sm:text-3xl">Ready to Ace Your Next Interview?</h2>
          <p className="relative max-w-xl mx-auto mb-8 text-lg text-[var(--nav-text)]">
            Start a practice session now and get AI-powered feedback in minutes.
          </p>
          <div className="relative">
            <Button href="/interview/new" name="Start Your Interview" style={{ fontWeight: 600 }} />
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
