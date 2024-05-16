
// Define available colors and sizes
type ButtonColor = 'blue' | 'red' | 'green' | 'purple';
type ButtonSize = 'small' | 'medium' | 'large';

// Props definition including new properties for color and size
type DefaultButtonProps = {
  label: string; // Text displayed on the button
  onClick: () => void; // Function to call when the button is clicked
  color?: ButtonColor; // Optional color of the button
  size?: ButtonSize; // Optional size of the button
};

// DefaultButton component definition
const DefaultButton: React.FC<DefaultButtonProps> = ({
  label,
  onClick,
  color = 'blue', // Default color
  size = 'medium' // Default size
}) => {
  // Define CSS classes for colors
  const colorClasses: Record<ButtonColor, string> = {
    blue: 'bg-ocean hover:bg-ocean-dark',
    red: 'bg-red hover:bg-red-dark',
    green: 'bg-lemon hover:bg-lemon-dark',
    purple: 'bg-purple hover:bg-purple-light',
  };

  // Define CSS classes for sizes
  const sizeClasses: Record<ButtonSize, string> = {
    small: 'px-2 py-1 text-sm',
    medium: 'px-4 py-2 text-md',
    large: 'px-6 py-3 text-lg',
  };

  // Combine classes based on props
  const buttonClasses = `${colorClasses[color]} ${sizeClasses[size]} text-sky select-none rounded`;

  return (
    <button onClick={onClick} className={buttonClasses}>
      {label}
    </button>
  );
};

export default DefaultButton;
