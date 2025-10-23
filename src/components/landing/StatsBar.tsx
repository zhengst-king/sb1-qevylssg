// src/components/landing/StatsBar.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Film, Users, Package, Star } from 'lucide-react';

interface StatItemProps {
  icon: React.ReactNode;
  value: string;
  label: string;
  delay?: number;
}

function StatItem({ icon, value, label, delay = 0 }: StatItemProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  // Extract number from value string (e.g., "500K+" -> 500)
  const targetNumber = parseInt(value.replace(/[^0-9]/g, '')) || 0;
  const suffix = value.replace(/[0-9]/g, '');

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [delay]);

  useEffect(() => {
    if (!isVisible) return;

    const duration = 2000; // 2 seconds
    const steps = 60;
    const increment = targetNumber / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= targetNumber) {
        setCount(targetNumber);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [isVisible, targetNumber]);

  return (
    <div 
      ref={ref} 
      className={`flex flex-col items-center space-y-2 p-6 transition-all duration-500 ${
        isVisible ? 'fade-up' : 'opacity-0'
      }`}
    >
      <div className="icon-bounce text-blue-600 mb-2">
        {icon}
      </div>
      <div className="text-4xl font-bold text-slate-900">
        {isVisible ? count.toLocaleString() : '0'}{suffix}
      </div>
      <div className="text-sm text-slate-600 font-medium">
        {label}
      </div>
    </div>
  );
}

export function StatsBar() {
  return (
    <section className="bg-white border-y border-slate-200 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x-0 md:divide-x divide-slate-200">
          <StatItem
            icon={<Film className="w-8 h-8" />}
            value="500K+"
            label="Movies & TV Shows"
            delay={0}
          />
          <StatItem
            icon={<Users className="w-8 h-8" />}
            value="1000+"
            label="Active Users"
            delay={200}
          />
          <StatItem
            icon={<Package className="w-8 h-8" />}
            value="50K+"
            label="Collections Created"
            delay={400}
          />
          <StatItem
            icon={<Star className="w-8 h-8" />}
            value="99%"
            label="User Satisfaction"
            delay={600}
          />
        </div>
      </div>
    </section>
  );
}