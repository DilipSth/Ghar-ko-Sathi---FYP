import { useState } from 'react';
import PropTypes from 'prop-types';

const SidebarLinkGroup = ({
  children,
  activeCondition,
}) => {
  const [open, setOpen] = useState(activeCondition);

  const handleClick = () => {
    setOpen(!open);
  };

  return <li>{children(handleClick, open)}</li>;
};

// Prop Types Validation
SidebarLinkGroup.propTypes = {
  children: PropTypes.func.isRequired, // Expecting a function as children
  activeCondition: PropTypes.bool.isRequired, // Expecting a boolean for activeCondition
};

export default SidebarLinkGroup;