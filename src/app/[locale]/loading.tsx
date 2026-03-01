import Logo from '@/components/ui/Logo';

export default function Loading() {
    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#F4F6F8]">
            <Logo size="lg" className="animate-pulse" />
        </div>
    );
}
