import Image from 'next/image';

interface LogoProps {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export default function Logo({ size = 'md', className = '' }: LogoProps) {
    const dimensions = {
        sm: { width: 80, height: 80 },
        md: { width: 120, height: 120 },
        lg: { width: 160, height: 160 },
    };

    const { width, height } = dimensions[size];

    return (
        <div className={`flex items-center justify-center ${className}`}>
            <Image
                src="/logo.png"
                alt="Pro24/7YA"
                width={width}
                height={height}
                className="object-contain"
                priority // Always priority as it represents the brand
            />
        </div>
    );
}
