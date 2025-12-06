// Helper function to check if a color is a hex value
export const isHexColor = (color: string): boolean => {
    return /^#[0-9A-Fa-f]{6}$/.test(color);
};

// Helper function to get style for background color
export const getBackgroundStyle = (color: string): React.CSSProperties | undefined => {
    if (isHexColor(color)) {
        return { backgroundColor: color };
    }
    return undefined;
};

// Helper function to get className for background color
export const getBackgroundClassName = (color: string): string => {
    if (isHexColor(color)) {
        return '';
    }
    return color;
};

