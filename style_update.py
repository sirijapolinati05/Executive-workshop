import re

with open('frontend/src/pages/form/LandingPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the blobs
content = re.sub(r'<div className="absolute top-0[^>]+></div>', '', content)
content = re.sub(r'<div className="absolute bottom-0[^>]+></div>', '', content)

# Change container style
content = content.replace('bg-[#111827]/70 backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]', 'bg-[#0a0a0a] border-2 border-[#00ff41] rounded-none overflow-hidden shadow-[8px_8px_0_rgba(0,255,65,0.2)]')

# Progress bar
content = content.replace('bg-slate-800/50', 'bg-[#111] border-b-2 border-[#00ff41]')
content = content.replace('bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400', 'bg-[#00ff41]')

# Step tags
content = content.replace('bg-white/5 border border-white/10 rounded-full', 'bg-black border border-[#00ff41] rounded-none text-[#00ff41]')
content = content.replace('text-purple-400', 'text-[#00ff41]')
content = content.replace('bg-purple-500', 'bg-[#00ff41]')
content = content.replace('text-pink-400', 'text-[#00ff41]')
content = content.replace('bg-pink-500', 'bg-[#00ff41]')

# Headings
content = content.replace('text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-100 to-slate-300', 'text-[#00ff41] uppercase tracking-widest')
content = content.replace('text-transparent bg-clip-text bg-gradient-to-r from-white via-pink-100 to-slate-300', 'text-[#00ff41] uppercase tracking-widest')

# Inputs
content = content.replace('bg-[#0b0f1a]/60 border border-white/10 hover:border-white/20', 'bg-[#050505] border-2 border-[#333] hover:border-[#00ff41]')
content = content.replace('bg-[#0b0f1a]/60', 'bg-[#050505]')
content = content.replace('border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.2)]', 'border-[#00ff41] shadow-[4px_4px_0_rgba(0,255,65,0.4)]')
content = content.replace('rounded-xl', 'rounded-none')

# Checkboxes
content = content.replace('bg-white/5 cursor-pointer hover:bg-white/10 hover:border-white/10 transition-all duration-300 backdrop-blur-sm', 'bg-[#050505] border-2 border-[#333] cursor-pointer hover:bg-[#111] hover:border-[#00ff41] transition-all duration-100 rounded-none')
content = content.replace('text-purple-500 focus:ring-purple-500 focus:ring-offset-0 accent-purple-500', 'text-[#00ff41] focus:ring-[#00ff41] focus:ring-offset-0 accent-[#00ff41] rounded-none')
content = content.replace('text-pink-500', 'text-[#00ff41]')

# Buttons
content = content.replace('bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold text-sm rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] hover:-translate-y-0.5', 'bg-[#00ff41] text-black font-bold uppercase tracking-wider text-sm rounded-none transition-all duration-100 shadow-[4px_4px_0_#009922] hover:shadow-[2px_2px_0_#009922] hover:translate-x-[2px] hover:translate-y-[2px]')

# Back button
content = content.replace('border border-white/10 text-white hover:bg-white/5 font-semibold text-sm rounded-xl transition-all duration-300 backdrop-blur-sm', 'border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41]/10 font-bold uppercase tracking-wider text-sm rounded-none transition-all duration-100')

with open('frontend/src/pages/form/LandingPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
