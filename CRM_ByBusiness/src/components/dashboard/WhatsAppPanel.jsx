import React, { useState } from 'react';
import { 
  Search, 
  Send, 
  User, 
  CheckCheck, 
  PhoneCall, 
  MoreVertical,
  Paperclip,
  Smile,
  MessageSquare
} from 'lucide-react';

const WhatsAppPanel = () => {
    const [selectedChat, setSelectedChat] = useState(null);
    const [message, setMessage] = useState('');

    const mockChats = [
        { id: 1, name: 'Juan Perez', lastMessage: 'Hola, me interesa el servicio', time: '12:45', unread: 2, status: 'leads' },
        { id: 2, name: 'Maria Garcia', lastMessage: '¿Cual es el precio?', time: '11:20', unread: 0, status: 'operaciones' },
        { id: 3, name: 'Servicios Logística SL', lastMessage: 'Archivo adjunto recibido', time: 'Ayer', unread: 0, status: 'ventas' },
    ];

    const mockMessages = [
        { id: 1, text: 'Hola, una consulta sobre los precios', sender: 'client', time: '12:00' },
        { id: 2, text: 'Hola Juan, dinos en qué podemos ayudarte', sender: 'operator', time: '12:05' },
        { id: 3, text: 'Me interesa el plan premium para 5 usuarios', sender: 'client', time: '12:10' },
    ];

    return (
        <div className="flex h-full gap-4 text-slate-200">
            {/* CHAT LIST SIDEBAR */}
            <div className="w-80 flex flex-col glass-panel overflow-hidden border-slate-800/50">
                <div className="p-4 border-b border-slate-800/50 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-black tracking-tighter text-white">COMUNICACIONES</h2>
                        <div className="flex gap-2 text-slate-500">
                            <MoreVertical className="w-4 h-4 cursor-pointer hover:text-white" />
                        </div>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input 
                            type="text" 
                            placeholder="Buscar contacto..." 
                            className="w-full bg-slate-950/50 border border-slate-800 rounded-lg py-2 pl-10 pr-4 text-xs focus:ring-1 focus:ring-brand-red focus:border-brand-red outline-none"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {mockChats.map(chat => (
                        <div 
                            key={chat.id}
                            onClick={() => setSelectedChat(chat)}
                            className={`p-4 flex gap-3 cursor-pointer transition-all border-b border-slate-800/20 ${
                                selectedChat?.id === chat.id 
                                ? 'bg-slate-800/40 border-l-4 border-brand-red' 
                                : 'hover:bg-slate-800/20'
                            }`}
                        >
                            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                                <User className="w-5 h-5 text-slate-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-1">
                                    <h3 className="text-xs font-bold text-white truncate">{chat.name}</h3>
                                    <span className="text-[10px] text-slate-500">{chat.time}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <p className="text-[11px] text-slate-400 truncate pr-2">{chat.lastMessage}</p>
                                    {chat.unread > 0 && (
                                        <span className="bg-brand-red text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                                            {chat.unread}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* CHAT WINDOW */}
            <div className="flex-1 flex flex-col glass-panel overflow-hidden border-slate-800/50">
                {selectedChat ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-4 border-b border-slate-800/50 flex items-center justify-between bg-slate-900/40">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-brand-red/30">
                                    <User className="w-5 h-5 text-brand-red" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-white tracking-tight">{selectedChat.name}</h3>
                                    <span className="text-[10px] text-brand-red font-mono uppercase tracking-widest">{selectedChat.status}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 text-slate-500">
                                <PhoneCall className="w-4 h-4 cursor-pointer hover:text-white" />
                                <Search className="w-4 h-4 cursor-pointer hover:text-white" />
                                <MoreVertical className="w-4 h-4 cursor-pointer hover:text-white" />
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-4 bg-slate-950/20">
                            {mockMessages.map(msg => (
                                <div key={msg.id} className={`flex ${msg.sender === 'operator' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[70%] p-3 rounded-2xl text-xs relative ${
                                        msg.sender === 'operator' 
                                        ? 'bg-brand-red/10 border border-brand-red/30 rounded-tr-none text-slate-100' 
                                        : 'bg-slate-800/60 border border-slate-700/50 rounded-tl-none text-slate-300'
                                    }`}>
                                        <p>{msg.text}</p>
                                        <div className="flex items-center justify-end gap-1 mt-1 opacity-50">
                                            <span className="text-[9px]">{msg.time}</span>
                                            {msg.sender === 'operator' && <CheckCheck className="w-3 h-3 text-brand-red" />}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-slate-900/50 border-t border-slate-800/50">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 text-slate-500">
                                    <Smile className="w-5 h-5 cursor-pointer hover:text-brand-red" />
                                    <Paperclip className="w-5 h-5 cursor-pointer hover:text-brand-red" />
                                </div>
                                <div className="flex-1 relative">
                                    <input 
                                        type="text" 
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        placeholder="Escribe un mensaje..."
                                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-3 px-4 text-xs focus:ring-1 focus:ring-brand-red outline-none"
                                    />
                                </div>
                                <button className="bg-brand-red hover:bg-red-700 text-white p-3 rounded-xl transition-all shadow-lg shadow-brand-red/20">
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-600 space-y-4 opacity-50">
                        <div className="w-20 h-20 rounded-full border-2 border-dashed border-slate-800 flex items-center justify-center">
                            <MessageSquare className="w-10 h-10" />
                        </div>
                        <p className="text-xs uppercase tracking-widest font-mono">Seleccione un chat para iniciar la operación</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WhatsAppPanel;
