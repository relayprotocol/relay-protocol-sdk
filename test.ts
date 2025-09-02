import { bytesToHex, Hex, hexToBytes } from "viem";
import * as tronweb from "tronweb";

const address = 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb';
const buff1 = Buffer.from(tronweb.utils.address.toHex(address), "hex");
const buff2 = hexToBytes('0x'+tronweb.utils.address.toHex(address) as Hex);

console.log(buff1, buff2)
console.log(bytesToHex(buff1) === bytesToHex(buff2))

console.log(tronweb.utils.address.fromHex(bytesToHex(buff2).slice(2)), bytesToHex(buff2).slice(2) === tronweb.utils.address.toHex(address))