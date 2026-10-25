import type {MuJoCoBackend} from './MuJoCoBackend';
export function measureStep(backend:MuJoCoBackend,steps=1){const start=performance.now();const oldTime=backend.data?.time??0;const snapshot=backend.step(steps);return {snapshot,metrics:{wallMs:performance.now()-start,simulatedSeconds:snapshot.time-oldTime,contacts:snapshot.contacts,actuators:backend.model?.nu??0}};}
