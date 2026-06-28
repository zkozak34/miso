export function SidebarLogo({ showText }: { showText: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-7 w-7 flex-none items-center justify-center rounded-[7px] bg-linear-to-br from-[#fb923c] to-[#e0651f] font-mono text-[15px] font-bold text-[#08080a]">
        M
      </div>
      {showText && (
        <span className="text-[15px] font-semibold tracking-tight whitespace-nowrap">Miso</span>
      )}
    </div>
  )
}
