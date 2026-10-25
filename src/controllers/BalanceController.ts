/** Balance only becomes available once a validated policy is attached. */
export interface BalancePolicy{calculate(observation:Float32Array,nu:number):Float32Array}
export function evaluateBalance(policy:BalancePolicy|null,observation:Float32Array,nu:number):number[]{
 if(!policy)throw Error('No validated balance policy installed');
 const output=Array.from(policy.calculate(observation,nu));
 if(output.length!==nu||output.some(v=>!Number.isFinite(v)||v<0||v>1))throw Error('Invalid balance policy output');
 return output;
}
