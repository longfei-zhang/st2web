import React from 'react';

import Highlight from '@stackstorm/module-highlight';

export default function debug(execution) {
  return (
    <Highlight code={execution.result} />
  );
}
