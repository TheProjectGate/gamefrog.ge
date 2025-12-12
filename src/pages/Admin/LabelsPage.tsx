import React, { useState, FormEvent, useEffect, useRef } from 'react';
import { FilterConfigItem, FilterGroup } from '../../types';
import { PlusIcon, EditIcon, TrashIcon, CloseIcon } from '../../components/Icons';
import { GripVertical } from 'lucide-react';
import useStore from '../../store/useStore';
import * as LucideIcons from 'lucide-react';
import { sanitizeSVG } from '../../utils/sanitize';
import { isHexColor, getBackgroundStyle, getBackgroundClassName } from '../../utils/colorUtils';

// Add global styles for SVG scaling
if (typeof document !== 'undefined') {
    const styleId = 'svg-scaling-styles';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .svg-container svg {
                width: 100% !important;
                height: 100% !important;
                max-width: 100% !important;
                max-height: 100% !important;
            }
        `;
        document.head.appendChild(style);
    }
}

const getIconNode = (iconName?: string, className?: string) => {
    if (!iconName) return null;
    const raw = String(iconName).trim();
    const tryNames = [raw, raw.replace(/\s+/g, ''), raw.replace(/[^a-zA-Z0-9]/g, '')];
    for (const key of tryNames) {
      const CompA = (LucideIcons as any)[key];
      if (CompA) return <CompA className={className || 'w-5 h-5'} />;
      const pascal = key
        .split(/[^a-zA-Z0-9]+/)
        .filter(Boolean)
        .map(s => s.charAt(0).toUpperCase() + s.slice(1))
        .join('');
      const CompB = (LucideIcons as any)[pascal];
      if (CompB) return <CompB className={className || 'w-5 h-5'} />;
    }
    return null;
};

// Remove duplicates using Set
const ICON_OPTIONS: string[] = Array.from(new Set([
    // GAMER ICONS - Games & entertainment
    'Gamepad2','Gamepad','Dice1','Dice2','Dice3','Dice4','Dice5','Dice6',
    'Puzzle','Play','Pause','PlayCircle','PauseCircle','SkipForward','SkipBack',
    'Volume2','VolumeX','Volume1','FastForward','Rewind','Repeat','Shuffle',
    
    // GAMER ICONS - Weapons & combat
    'Sword','Shield','ShieldCheck','ShieldAlert','ShieldOff','Crosshair',
    'Wand2','Bomb','Skull','Ghost','Axe','Zap','Bolt','Target','Circle',
    
    // GAMER ICONS - Rewards & achievements
    'Trophy','Medal','Gift','Rocket','Gem','Crown','Award','Badge','Star',
    'Stars','Sparkles',
    
    // GAMER ICONS - Characters & creatures
    'Cat','Dog','PawPrint',
    
    // GAMER ICONS - Magic & elements
    'Flame','Droplet','Snowflake',
    'Wind','Tree','Leaf','Flower','Mountain','Sun','Moon',
    
    // GAMER ICONS - Inventory & items
    'Package','Box','Lock','Key','Bag','Book','Map','Compass',
    
    // GAMER ICONS - Game UI elements
    'Heart','Eye','EyeOff',
    'Activity','TrendingUp','TrendingDown',
    
    // Technology
    'Monitor','Laptop','Smartphone','Tablet','Tv','Cpu','Mouse','Keyboard',
    'Bot','HardDrive','Database','Server','Cloud','Wifi','Bluetooth','Usb',
    'Plug','Battery','BatteryCharging','Code','Code2','Terminal',
    'GitBranch','GitCommit','GitMerge','Cog','Settings','Wrench',
    
    // Media & content
    'Disc','Music','Film','Clapperboard','Camera','Headphones','Mic','Video',
    'Image','Files','FileText','FileImage','FileMusic','FileVideo','Radio',
    'Speaker',
    
    // Books & education
    'BookOpen','GraduationCap','School','PenTool','Highlighter',
    'Bookmark','Library',
    
    // Geography & navigation
    'MapPin','Navigation','Navigation2','Globe','Earth','Flag',
    
    // Transportation
    'Car','Bike','Bus','Train','Ship','Plane','Helicopter','Truck','Scooter',
    
    // Nature & elements
    'CloudRain','Umbrella',
    
    // Food & beverages
    'Coffee','Beer','Wine','Pizza','IceCream','Cookie','Apple','Cherry',
    'Banana','Carrot',
    
    // Sports & activities
    'Football','Basketball','Volleyball','Tennis','Baseball','Golf',
    'Swimming','Running','Dumbbell',
    
    // Emotions & faces
    'Smile','Frown','Meh','ThumbsUp','ThumbsDown','Hand',
    
    // Money & finance
    'DollarSign','Euro','Pound','Yen','Bitcoin','Wallet','CreditCard',
    'Receipt','Banknote','Coins',
    
    // Time & calendar
    'Clock','Calendar','Timer','Stopwatch','Hourglass','History','AlarmClock',
    
    // Social media & communication
    'Mail','MessageCircle','MessageSquare','Phone','PhoneCall','VideoCall',
    'Users','User','UserPlus','UserCheck','UserX','Share2','Send',
    
    // Security & access
    'Unlock','Fingerprint',
    
    // Utilities & tools
    'Search','Filter','Sliders','Plus','Minus','X','Check','AlertCircle',
    'Info','HelpCircle','Trash','Trash2','Edit','Pencil','Copy','Scissors',
    'Folder','FolderOpen','Archive','Download','Upload','Link','Unlink',
    'Maximize','Minimize','RotateCw','RotateCcw','RefreshCw',
    'ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ChevronUp','ChevronDown',
    'ChevronLeft','ChevronRight','MoreHorizontal','MoreVertical',
    
    // Animals
    'Fish','Bird','Bug','Snake','Rabbit',
    
    // Musical instruments
    'Guitar',
    
    // Miscellaneous
    'Lightbulb','Flashlight','Candle','Palette','Paintbrush','Brush','Ruler',
    'ShoppingCart','Layers','Grid','Layout','LayoutList','LayoutGrid',
    'Menu','List','Columns','Rows','BarChart','LineChart','PieChart'
]));

const IconPreview: React.FC<{ name?: string; customSvg?: string; className?: string }> = ({ name, customSvg, className }) => {
    if (customSvg) {
        return (
            <div 
                className={`${className || 'w-5 h-5'} svg-container`}
                dangerouslySetInnerHTML={{ __html: sanitizeSVG(customSvg) }}
                style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    overflow: 'hidden'
                }}
            />
        );
    }
    if (!name) return null;
    const Comp = (LucideIcons as any)[name];
    if (!Comp) return <span className="text-xs text-red-600">Unknown icon</span>;
    return <Comp className={className || 'w-5 h-5'} />;
};

const ConfigFormModal: React.FC<{
    group: FilterGroup;
    parentId?: string;
    parentLabel?: string;
    item: { name: string, config: FilterConfigItem } | null;
    onClose: () => void;
    onSave: (groupId: string, parentId: string | undefined, oldName: string, newName: string, item: FilterConfigItem) => void;
}> = ({ group, parentId, parentLabel, item, onClose, onSave }) => {
    const [name, setName] = useState(item?.name || '');
    const [config, setConfig] = useState<FilterConfigItem>(item?.config || { color: 'bg-gray-200', textColor: 'text-black', symbol: '', iconName: '', showIcons: true });
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [iconQuery, setIconQuery] = useState('');

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type === 'image/svg+xml') {
            const reader = new FileReader();
            reader.onload = (event) => {
                const svgContent = event.target?.result as string;
                setConfig(c => ({ ...c, customSvg: svgContent, iconName: undefined }));
            };
            reader.readAsText(file);
        } else {
            alert('Please select an SVG file');
        }
    };

    const filteredIcons = ICON_OPTIONS.filter(n => n.toLowerCase().includes(iconQuery.toLowerCase()));

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        onSave(group.id, parentId, item?.name || '', name, config);
    };

    const titleCore = item ? 'Edit' : 'Add';
    const headline = parentLabel
        ? `${titleCore} ${parentLabel} Sub Filter`
        : `${titleCore} ${group.label} Item`;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-2 sm:p-4" onClick={onClose}>
            <div className="bg-white border-4 border-black w-full max-w-lg max-h-[95vh] sm:max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-3 sm:p-4 border-b-4 border-black">
                    <h2 className="text-xl sm:text-2xl lg:text-3xl font-display uppercase">
                        {headline}
                    </h2>
                    <button onClick={onClose}><CloseIcon className="w-6 h-6 sm:w-7 sm:h-7"/></button>
                </div>
                <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
                    <div>
                        <label htmlFor="filter-item-name" className="block font-bold mb-1">{parentLabel ? `${parentLabel} Sub Filter Name` : `${group.label} Name`}</label>
                        <input id="filter-item-name" name="filter-item-name" type="text" value={name} onChange={e => setName(e.target.value)} className="w-full border-2 border-black p-2" required />
                    </div>
                    <div>
                        <label htmlFor="filter-item-symbol" className="block font-bold mb-1">Symbol (3 chars max)</label>
                        <input id="filter-item-symbol" name="filter-item-symbol" type="text" value={config.symbol} onChange={e => setConfig(c => ({...c, symbol: e.target.value.substring(0,3).toUpperCase()}))} className="w-full border-2 border-black p-2" required maxLength={3} />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                        <div className="w-full sm:w-1/2">
                            <label htmlFor="filter-item-background-color" className="block font-bold mb-0.5 text-sm">Background Color</label>
                            <div className="flex gap-1.5">
                                <input 
                                    id="filter-item-background-color"
                                    name="filter-item-background-color"
                                    type="text" 
                                    value={config.color} 
                                    onChange={e => {
                                        let value = e.target.value;
                                        // Auto-format hex colors
                                        if (value.startsWith('#') && value.length <= 7) {
                                            // Allow typing hex colors
                                            value = value.toUpperCase();
                                        }
                                        setConfig(c => ({...c, color: value}));
                                    }} 
                                    className="flex-1 border-2 border-black p-1.5 text-sm h-10" 
                                    placeholder="#000000 or bg-blue-500" 
                                    required 
                                />
                                <input 
                                    id="filter-item-background-color-picker"
                                    name="filter-item-background-color-picker"
                                    type="color" 
                                    value={isHexColor(config.color) ? config.color : '#000000'} 
                                    onChange={e => setConfig(c => ({...c, color: e.target.value.toUpperCase()}))} 
                                    className="w-10 h-10 aspect-square border-2 border-black cursor-pointer flex-shrink-0 p-1" 
                                    title="Pick a color"
                                />
                            </div>
                            <p className="text-[10px] text-black/60 mt-0.5 leading-tight">Hex (#000000) or Tailwind (bg-blue-500)</p>
                        </div>
                        <div className="w-full sm:w-1/2">
                            <label htmlFor="filter-item-text-color" className="block font-bold mb-0.5 text-sm">Text Color</label>
                            <input id="filter-item-text-color" name="filter-item-text-color" type="text" value={config.textColor} onChange={e => setConfig(c => ({...c, textColor: e.target.value}))} className="w-full border-2 border-black p-1.5 text-sm h-10" placeholder="e.g. text-white" required />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="filter-item-icon-name" className="block font-bold mb-1">Icon (Lucide or custom SVG)</label>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 border-2 border-black flex items-center justify-center bg-white flex-shrink-0">
                                <IconPreview name={config.iconName} customSvg={config.customSvg} className="w-6 h-6" />
                            </div>
                            <input 
                                id="filter-item-icon-name"
                                name="filter-item-icon-name"
                                type="text" 
                                value={config.iconName || ''} 
                                onChange={e => setConfig(c => ({...c, iconName: e.target.value, customSvg: undefined}))} 
                                className="flex-1 border-2 border-black p-2" 
                                placeholder="Gamepad2" 
                            />
                            <button type="button" onClick={() => setIsPickerOpen(v => !v)} className="border-2 border-black px-3 py-2 font-bold bg-white hover:bg-gray-100 flex-shrink-0">
                                {isPickerOpen ? 'Close' : 'Choose'}
                            </button>
                        </div>
                        <div className="mt-2">
                            <label htmlFor="filter-item-svg-upload" className="block font-bold mb-1 text-sm">Or upload a custom SVG:</label>
                            <input 
                                id="filter-item-svg-upload"
                                name="filter-item-svg-upload"
                                type="file" 
                                accept=".svg,image/svg+xml" 
                                onChange={handleFileUpload}
                                className="w-full border-2 border-black p-2 text-sm"
                            />
                            {config.customSvg && (
                                <button 
                                    type="button" 
                                    onClick={() => setConfig(c => ({...c, customSvg: undefined}))}
                                    className="mt-2 text-xs border border-black px-2 py-1 bg-red-100 hover:bg-red-200"
                                >
                                    Remove custom icon
                                </button>
                            )}
                        </div>
                        {isPickerOpen && (
                            <div className="mt-3 border-2 border-black p-3 bg-white">
                                <div className="flex items-center gap-2 mb-3">
                                    <input id="icon-search" name="icon-search" value={iconQuery} onChange={e => setIconQuery(e.target.value)} placeholder="Search icons..." className="flex-1 border-2 border-black p-2" />
                                    <button type="button" onClick={() => setIconQuery('')} className="border-2 border-black px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200">Clear</button>
                                </div>
                                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 gap-2 max-h-56 overflow-y-auto overflow-x-hidden">
                                    {filteredIcons.map(name => {
                                        const Comp = (LucideIcons as any)[name];
                                        return (
                                            <button key={name} type="button" onClick={() => { setConfig(c => ({...c, iconName: name, customSvg: undefined})); setIsPickerOpen(false); }} className={`flex items-center justify-center border-2 border-black p-2 bg-white hover:bg-[#FFD700] ${config.iconName === name ? 'bg-[#FFD700]' : ''}`} title={name}>
                                                {Comp ? <Comp className="w-5 h-5" /> : <span className="text-xs">{name}</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                                <p className="mt-2 text-xs text-black/60">Tip: type part of the name, e.g. "game" → Gamepad2.</p>
                            </div>
                        )}
                        <p className="text-xs text-black/60 mt-1">Leave empty to display only text or a symbol.</p>
                    </div>
                    <div>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={config.showIcons !== false}
                                onChange={(e) => setConfig(c => ({ ...c, showIcons: e.target.checked }))}
                                className="w-5 h-5 border-2 border-black cursor-pointer"
                            />
                            <span className="font-bold">Show Icons</span>
                            <span className="text-sm text-black/60">(Display icons for this filter item)</span>
                        </label>
                    </div>
                    <div className="flex items-center gap-3">
                        <span 
                            className={`${getBackgroundClassName(config.color)} ${config.textColor} w-12 h-12 flex items-center justify-center font-bold text-lg border-2 border-black`}
                            style={getBackgroundStyle(config.color)}
                        >
                            {config.showIcons !== false && config.customSvg ? (
                                <div 
                                    className="w-6 h-6 svg-container" 
                                    dangerouslySetInnerHTML={{ __html: sanitizeSVG(config.customSvg) }}
                                    style={{ overflow: 'hidden' }}
                                />
                            ) : config.showIcons !== false && config.iconName ? (
                                getIconNode(config.iconName, 'w-6 h-6') || config.symbol
                            ) : (
                                config.symbol
                            )}
                        </span>
                        <span className="text-sm">Icon: {config.customSvg ? 'Custom SVG' : (config.iconName || '—')}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="btn-pop bg-gray-200 text-black font-bold py-3 px-6 border-4 border-black w-full sm:w-auto">Cancel</button>
                        <button type="submit" className="btn-pop bg-[#FFD700] text-black font-bold py-3 px-6 border-4 border-black w-full sm:w-auto">Save</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const GroupFormModal: React.FC<{
    mode: 'add' | 'rename';
    label: string;
    onChange: (value: string) => void;
    onSubmit: () => void;
    onClose: () => void;
}> = ({ mode, label, onChange, onSubmit, onClose }) => (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-white border-4 border-black w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b-4 border-black p-4">
                <h2 className="text-2xl font-display uppercase">{mode === 'add' ? 'Add Group' : 'Rename Group'}</h2>
                <button onClick={onClose}>
                    <CloseIcon className="w-6 h-6" />
                </button>
            </div>
            <form
                onSubmit={e => {
                    e.preventDefault();
                    onSubmit();
                }}
                className="p-4 space-y-4"
            >
                <div>
                    <label htmlFor="filter-group-name" className="block font-bold mb-2">Group Name</label>
                    <input
                        id="filter-group-name"
                        name="filter-group-name"
                        type="text"
                        value={label}
                        onChange={e => onChange(e.target.value)}
                        className="w-full border-2 border-black p-2"
                        required
                    />
                </div>
                <div className="flex gap-3 justify-end">
                    <button type="button" onClick={onClose} className="btn-pop bg-gray-200 text-black font-bold py-2 px-4 border-4 border-black">
                        Cancel
                    </button>
                    <button type="submit" className="btn-pop bg-[#FFD700] text-black font-bold py-2 px-4 border-4 border-black">
                        Save
                    </button>
                </div>
            </form>
        </div>
    </div>
);

const LabelsPage: React.FC = () => {
    const {
        filterGroups,
        filterGroupOrder,
        addFilterGroup,
        renameFilterGroup,
        deleteFilterGroup,
        saveFilterItem,
        deleteFilterItem,
        reorderFilterItems,
        reorderFilterGroups,
    } = useStore();

    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
    const [activeGroupForItems, setActiveGroupForItems] = useState<FilterGroup | null>(null);
    const [editingConfig, setEditingConfig] = useState<{ name: string, config: FilterConfigItem } | null>(null);
    const [editingParent, setEditingParent] = useState<{ parentId?: string; parentLabel?: string } | null>(null);
    const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

    // Initialize all groups as collapsed by default
    useEffect(() => {
        const initial: Record<string, boolean> = {};
        filterGroupOrder.forEach(groupId => {
            initial[groupId] = true;
        });
        setCollapsedGroups(prev => {
            // Only initialize if not already set
            const hasAnyValue = Object.keys(prev).length > 0;
            return hasAnyValue ? prev : initial;
        });
    }, [filterGroupOrder]);

    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [groupModalMode, setGroupModalMode] = useState<'add' | 'rename'>('add');
    const [groupModalLabel, setGroupModalLabel] = useState('');
    const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
    
    // Drag and drop state for filter items
    const [draggedItem, setDraggedItem] = useState<{ groupId: string; itemName: string; parentId?: string } | null>(null);
    const [dragOverItem, setDragOverItem] = useState<{ groupId: string; itemName: string; parentId?: string } | null>(null);
    
    // Drag and drop state for filter groups
    const [draggedGroup, setDraggedGroup] = useState<string | null>(null);
    const [dragOverGroup, setDragOverGroup] = useState<string | null>(null);

    const handleOpenConfigModal = (
        group: FilterGroup,
        item: { name: string, config: FilterConfigItem } | null = null,
        parentMeta?: { parentId?: string; parentLabel?: string }
    ) => {
        setActiveGroupForItems(group);
        setEditingConfig(item);
        setEditingParent(parentMeta || null);
        setIsConfigModalOpen(true);
    };

    const handleCloseConfigModal = () => {
        setActiveGroupForItems(null);
        setEditingConfig(null);
        setEditingParent(null);
        setIsConfigModalOpen(false);
    };

    const handleSaveConfig = (groupId: string, parentId: string | undefined, oldName: string, newName: string, item: FilterConfigItem) => {
        saveFilterItem(groupId, oldName, newName, item, parentId);
        handleCloseConfigModal();
    };

    const handleDeleteConfig = async (groupId: string, name: string, parentId?: string) => {
        if (window.confirm(`Delete "${name}" from this group?`)) {
            await deleteFilterItem(groupId, name, parentId);
        }
    };

    const handleDuplicateConfig = async (groupId: string, name: string, config: FilterConfigItem, parentId?: string) => {
        const group = filterGroups[groupId];
        if (!group) return;

        // Find existing names to generate unique name
        let existingNames: string[];
        if (parentId) {
            const parent = group.items[parentId];
            existingNames = parent?.children ? Object.keys(parent.children) : [];
        } else {
            existingNames = Object.keys(group.items);
        }

        // Generate unique name
        let newName = `${name} Copy`;
        let counter = 1;
        while (existingNames.includes(newName)) {
            newName = `${name} Copy ${counter}`;
            counter++;
        }

        // Create duplicate with same config but new name
        await saveFilterItem(groupId, '', newName, config, parentId);
    };


    const handleDragStart = (e: React.DragEvent, groupId: string, itemName: string, parentId?: string) => {
        e.stopPropagation(); // Prevent parent drag handlers from interfering
        setDraggedItem({ groupId, itemName, parentId });
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', ''); // Required for Firefox
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.opacity = '0.5';
        }
    };

    const handleDragEnd = (e: React.DragEvent) => {
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.opacity = '1';
        }
        setDraggedItem(null);
        setDragOverItem(null);
    };

    const handleDragOver = (e: React.DragEvent, groupId: string, itemName: string, parentId?: string) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent parent drag handlers from interfering
        e.dataTransfer.dropEffect = 'move';
        
        if (draggedItem && draggedItem.groupId === groupId && draggedItem.parentId === parentId && draggedItem.itemName !== itemName) {
            setDragOverItem({ groupId, itemName, parentId });
        }
    };

    const handleDragLeave = () => {
        setDragOverItem(null);
    };

    const handleDrop = async (e: React.DragEvent, groupId: string, itemName: string, parentId?: string) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent parent drag handlers from interfering
        setDragOverItem(null);
        
        if (!draggedItem || draggedItem.groupId !== groupId || draggedItem.parentId !== parentId || draggedItem.itemName === itemName) {
            return;
        }
        
        const group = filterGroups[groupId];
        if (!group) return;
        
        let items: string[];
        if (parentId) {
            const parent = group.items[parentId];
            if (!parent?.children) return;
            items = Object.keys(parent.children);
        } else {
            items = Object.keys(group.items);
        }
        
        const draggedIndex = items.indexOf(draggedItem.itemName);
        const dropIndex = items.indexOf(itemName);
        
        if (draggedIndex === -1 || dropIndex === -1) return;
        
        // Reorder items
        const newOrder = [...items];
        newOrder.splice(draggedIndex, 1);
        newOrder.splice(dropIndex, 0, draggedItem.itemName);
        
        await reorderFilterItems(groupId, newOrder, parentId);
        setDraggedItem(null);
    };

    // Drag and drop handlers for filter groups
    const handleGroupDragStart = (e: React.DragEvent, groupId: string) => {
        setDraggedGroup(groupId);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', ''); // Required for Firefox
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.opacity = '0.5';
        }
    };

    const handleGroupDragEnd = (e: React.DragEvent) => {
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.opacity = '1';
        }
        setDraggedGroup(null);
        setDragOverGroup(null);
    };

    const handleGroupDragOver = (e: React.DragEvent, groupId: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        if (draggedGroup && draggedGroup !== groupId) {
            setDragOverGroup(groupId);
        }
    };

    const handleGroupDragLeave = () => {
        setDragOverGroup(null);
    };

    const handleGroupDrop = async (e: React.DragEvent, groupId: string) => {
        e.preventDefault();
        setDragOverGroup(null);
        
        if (!draggedGroup || draggedGroup === groupId) {
            return;
        }
        
        const currentOrder = [...filterGroupOrder];
        const draggedIndex = currentOrder.indexOf(draggedGroup);
        const dropIndex = currentOrder.indexOf(groupId);
        
        if (draggedIndex === -1 || dropIndex === -1) return;
        
        // Reorder groups
        const newOrder = [...currentOrder];
        newOrder.splice(draggedIndex, 1);
        newOrder.splice(dropIndex, 0, draggedGroup);
        
        await reorderFilterGroups(newOrder);
        setDraggedGroup(null);
    };

    const toggleConfigSection = (groupId: string) => {
        setCollapsedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
    };

    const handleOpenGroupModal = (mode: 'add' | 'rename', group?: FilterGroup) => {
        setGroupModalMode(mode);
        setGroupModalLabel(group?.label || '');
        setEditingGroupId(group?.id || null);
        setIsGroupModalOpen(true);
    };

    const handleGroupSubmit = () => {
        if (groupModalMode === 'add') {
            addFilterGroup(groupModalLabel.trim());
        } else if (editingGroupId) {
            renameFilterGroup(editingGroupId, groupModalLabel.trim());
        }
        setIsGroupModalOpen(false);
        setGroupModalLabel('');
        setEditingGroupId(null);
    };

    const renderGroup = (group: FilterGroup) => {
        const config = group.items;
        const isCollapsed = collapsedGroups[group.id];

        const isGroupDragging = draggedGroup === group.id;
        const isGroupDragOver = dragOverGroup === group.id;
        
        return (
        <div 
            key={group.id} 
            className={`bg-white border-4 border-black transition-all ${isGroupDragging ? 'opacity-50' : ''} ${isGroupDragOver ? 'border-[#FFD700] bg-yellow-50' : ''}`}
            draggable
            onDragStart={(e) => handleGroupDragStart(e, group.id)}
            onDragEnd={handleGroupDragEnd}
            onDragOver={(e) => handleGroupDragOver(e, group.id)}
            onDragLeave={handleGroupDragLeave}
            onDrop={(e) => handleGroupDrop(e, group.id)}
        >
            <div className="flex flex-col gap-3 border-b-4 border-black p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                        <div 
                            className="cursor-grab active:cursor-grabbing p-1 text-black/40 hover:text-black"
                            title="Drag to reorder groups"
                        >
                            <GripVertical className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl sm:text-2xl font-display uppercase">{group.label}</h3>
                        <button
                            onClick={() => toggleConfigSection(group.id)}
                            className="text-xs font-bold uppercase border-2 border-black px-3 py-1 bg-white hover:bg-gray-100"
                        >
                            {isCollapsed ? 'Expand' : 'Collapse'}
                        </button>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => handleOpenGroupModal('rename', group)} className="border-2 border-black px-3 py-1 font-bold text-xs bg-white hover:bg-gray-100">
                        Rename
                    </button>
                    <button
                        onClick={() => {
                            if (window.confirm(`Delete group "${group.label}"?`)) deleteFilterGroup(group.id);
                        }}
                        disabled={['genre', 'platform'].includes(group.id)}
                        className="border-2 border-black px-3 py-1 font-bold text-xs bg-white hover:bg-red-500 hover:text-white disabled:opacity-40 disabled:pointer-events-none"
                    >
                        Delete
                    </button>
                    <button onClick={() => handleOpenConfigModal(group)} className="btn-pop bg-[#FFD700] text-black font-bold px-4 py-2 border-4 border-black flex items-center gap-2 text-sm">
                        <PlusIcon className="w-4 h-4"/> Add Item
                    </button>
                </div>
            </div>
            {!isCollapsed ? (
                <div className="p-4 space-y-4">
                    {Object.keys(config).length > 0 ? (
                        Object.entries(config).map(([name, itemConfig], index, array) => {
                            const children = itemConfig.children ? Object.entries(itemConfig.children) : [];
                            const isDragging = draggedItem?.groupId === group.id && draggedItem?.itemName === name && !draggedItem?.parentId;
                            const isDragOver = dragOverItem?.groupId === group.id && dragOverItem?.itemName === name && !dragOverItem?.parentId;
                            
                            return (
                                <div 
                                    key={name} 
                                    className={`border-4 border-black bg-white p-4 space-y-4 transition-all ${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'border-[#FFD700] bg-yellow-50' : ''}`}
                                    draggable
                                    onDragStart={(e) => {
                                        // Only allow dragging if clicking on the main filter item itself, not on child elements
                                        if ((e.target as HTMLElement).closest('.sub-filter-container')) {
                                            e.preventDefault();
                                            return;
                                        }
                                        handleDragStart(e, group.id, name);
                                    }}
                                    onDragEnd={handleDragEnd}
                                    onDragOver={(e) => {
                                        // Don't handle drag over if it's a sub-filter being dragged
                                        if (draggedItem?.parentId) {
                                            return;
                                        }
                                        handleDragOver(e, group.id, name);
                                    }}
                                    onDragLeave={handleDragLeave}
                                    onDrop={(e) => {
                                        // Don't handle drop if it's a sub-filter being dropped
                                        if (draggedItem?.parentId) {
                                            return;
                                        }
                                        handleDrop(e, group.id, name);
                                    }}
                                >
                                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                        <div className="flex items-center gap-4">
                                            <div 
                                                className="cursor-grab active:cursor-grabbing p-1 text-black/40 hover:text-black"
                                                title="Drag to reorder"
                                            >
                                                <GripVertical className="w-5 h-5" />
                                            </div>
                                            <span 
                                                className={`${getBackgroundClassName(itemConfig.color)} ${itemConfig.textColor} w-12 h-12 flex items-center justify-center font-bold text-lg border-2 border-black`}
                                                style={getBackgroundStyle(itemConfig.color)}
                                            >
                                                {itemConfig.customSvg ? (
                                                    <div 
                                                        className="w-6 h-6 svg-container" 
                                                        dangerouslySetInnerHTML={{ __html: sanitizeSVG(itemConfig.customSvg) }}
                                                        style={{ overflow: 'hidden' }}
                                                    />
                                                ) : (
                                                    getIconNode(itemConfig.iconName, 'w-6 h-6') || itemConfig.symbol
                                                )}
                                            </span>
                                            <div>
                                                <h4 className="text-lg font-bold">{name}</h4>
                                                <p className="text-xs font-mono">{itemConfig.color} · {itemConfig.textColor}{itemConfig.iconName ? ` · ${itemConfig.iconName}` : ''}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <button onClick={() => handleOpenConfigModal(group, {name, config: itemConfig})} className="p-2 bg-white text-black border-2 border-black hover:bg-gray-200 flex items-center gap-2 text-sm font-bold">
                                                <EditIcon className="w-4 h-4" /> Edit
                                            </button>
                                            <button onClick={() => handleDeleteConfig(group.id, name)} className="p-2 bg-white text-black border-2 border-black hover:bg-red-500 hover:text-white flex items-center gap-2 text-sm font-bold">
                                                <TrashIcon className="w-4 h-4" /> Delete
                                            </button>
                                            <button onClick={() => handleOpenConfigModal(group, null, { parentId: name, parentLabel: name })} className="p-2 bg-[#FFD700] text-black border-2 border-black flex items-center gap-2 text-sm font-bold">
                                                <PlusIcon className="w-4 h-4" /> Add Sub Filter
                                            </button>
                                        </div>
                                    </div>
                                    {children.length > 0 && (
                                        <div className="border-t-2 border-dashed border-black/20 pt-3 space-y-2">
                                            <p className="text-xs font-bold uppercase tracking-[0.3em] text-black/60">Sub Filters</p>
                                            {children.map(([childName, childConfig], childIndex) => {
                                                const isChildDragging = draggedItem?.groupId === group.id && draggedItem?.itemName === childName && draggedItem?.parentId === name;
                                                const isChildDragOver = dragOverItem?.groupId === group.id && dragOverItem?.itemName === childName && dragOverItem?.parentId === name;
                                                return (
                                                <div 
                                                    key={childName} 
                                                    className={`sub-filter-container flex flex-col gap-2 md:flex-row md:items-center md:justify-between border border-dashed border-black/20 p-2 transition-all ${isChildDragging ? 'opacity-50' : ''} ${isChildDragOver ? 'border-[#FFD700] bg-yellow-50' : ''}`}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, group.id, childName, name)}
                                                    onDragEnd={handleDragEnd}
                                                    onDragOver={(e) => handleDragOver(e, group.id, childName, name)}
                                                    onDragLeave={handleDragLeave}
                                                    onDrop={(e) => handleDrop(e, group.id, childName, name)}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div 
                                                            className="cursor-grab active:cursor-grabbing p-1 text-black/40 hover:text-black"
                                                            title="Drag to reorder"
                                                        >
                                                            <GripVertical className="w-4 h-4" />
                                                        </div>
                                                        <span 
                                                            className={`${getBackgroundClassName(childConfig.color)} ${childConfig.textColor} w-10 h-10 flex items-center justify-center font-bold text-sm border-2 border-black`}
                                                            style={getBackgroundStyle(childConfig.color)}
                                                        >
                                                            {childConfig.customSvg ? (
                                                                <div 
                                                                    className="w-5 h-5 svg-container" 
                                                                    dangerouslySetInnerHTML={{ __html: sanitizeSVG(childConfig.customSvg) }}
                                                                    style={{ overflow: 'hidden' }}
                                                                />
                                                            ) : (
                                                                getIconNode(childConfig.iconName, 'w-5 h-5') || childConfig.symbol
                                                            )}
                                                        </span>
                                                        <div>
                                                            <p className="font-semibold text-sm">{childName}</p>
                                                            <p className="text-xs font-mono text-black/70">{childConfig.color} · {childConfig.textColor}{childConfig.iconName ? ` · ${childConfig.iconName}` : ''}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => handleOpenConfigModal(group, { name: childName, config: childConfig }, { parentId: name, parentLabel: name })} className="p-2 bg-white text-black border-2 border-black hover:bg-gray-200 flex items-center gap-2 text-xs font-bold">
                                                            <EditIcon className="w-4 h-4" /> Edit
                                                        </button>
                                                        <button onClick={() => handleDuplicateConfig(group.id, childName, childConfig, name)} className="p-2 bg-white text-black border-2 border-black hover:bg-blue-500 hover:text-white flex items-center gap-2 text-xs font-bold">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-copy"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2h8c1.1 0 2 .9 2 2"/></svg> Duplicate
                                                        </button>
                                                        <button onClick={() => handleDeleteConfig(group.id, childName, name)} className="p-2 bg-white text-black border-2 border-black hover:bg-red-500 hover:text-white flex items-center gap-2 text-xs font-bold">
                                                            <TrashIcon className="w-4 h-4" /> Delete
                                                        </button>
                                                    </div>
                                                </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <p className="text-sm font-semibold text-black/60">No labels yet. Add them in the admin panel.</p>
                    )}
                </div>
            ) : (
                <div className="p-4 text-sm font-semibold text-black/70 border-t-2 border-dashed border-black/20">
                    {Object.keys(config).length} items hidden. Click “Expand” to view details.
                </div>
            )}
        </div>
        );
    };

    const orderedGroups = filterGroupOrder.map(id => filterGroups[id]).filter(Boolean);

    return (
        <div className="space-y-6 sm:space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b-4 border-black pb-2">
                <h2 className="text-3xl sm:text-4xl font-display uppercase">Labels & Filters</h2>
                <button onClick={() => handleOpenGroupModal('add')} className="btn-pop bg-[#FFD700] text-black font-bold py-2 px-4 border-4 border-black flex items-center gap-2 w-full sm:w-auto">
                    <PlusIcon className="w-5 h-5"/> Add Group
                </button>
            </div>

            {orderedGroups.map(group => renderGroup(group))}

            {isConfigModalOpen && activeGroupForItems && (
                <ConfigFormModal
                    group={activeGroupForItems}
                    parentId={editingParent?.parentId}
                    parentLabel={editingParent?.parentLabel}
                    item={editingConfig}
                    onClose={handleCloseConfigModal}
                    onSave={handleSaveConfig}
                />
            )}

            {isGroupModalOpen && (
                <GroupFormModal
                    mode={groupModalMode}
                    label={groupModalLabel}
                    onChange={setGroupModalLabel}
                    onSubmit={handleGroupSubmit}
                    onClose={() => setIsGroupModalOpen(false)}
                />
            )}
        </div>
    );
};

export default LabelsPage;

