// src/components/ui/Card.jsx
import PropTypes from 'prop-types';

export const Card = ({ className = '', children, ...props }) => {
  return (
    <div 
      className={`rounded-lg bg-white dark:bg-gray-800 shadow-sm ${className}`} 
      {...props}
    >
      {children}
    </div>
  );
};

Card.propTypes = {
    className: PropTypes.string,
    children: PropTypes.node.isRequired,
  };

export const CardHeader = ({ className = '', children, ...props }) => {
  return (
    <div 
      className={`flex flex-col space-y-1.5 p-6 ${className}`} 
      {...props}
    >
      {children}
    </div>
  );
};

CardHeader.propTypes = {
    className: PropTypes.string,
    children: PropTypes.node.isRequired,
  };

export const CardTitle = ({ className = '', children, ...props }) => {
  return (
    <h3 
      className={`text-2xl font-semibold leading-none tracking-tight text-gray-900 dark:text-white ${className}`} 
      {...props}
    >
      {children}
    </h3>
  );
};

CardTitle.propTypes = {
    className: PropTypes.string,
    children: PropTypes.node.isRequired,
  };

export const CardContent = ({ className = '', children, ...props }) => {
  return (
    <div 
      className={`p-6 pt-0 ${className}`} 
      {...props}
    >
      {children}
    </div>
  );
};


CardContent.propTypes = {
    className: PropTypes.string,
    children: PropTypes.node.isRequired,
  };


