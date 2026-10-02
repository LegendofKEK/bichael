//! Big-endian 256-bit word. Byte order matches a Solidity `uint256`.

use std::cmp::Ordering;
use std::fmt;

#[derive(Clone, Copy, PartialEq, Eq, Hash)]
pub struct U256(pub [u8; 32]);

impl U256 {
    pub const ZERO: Self = Self([0u8; 32]);

    pub fn from_u64(v: u64) -> Self {
        let mut a = [0u8; 32];
        a[24..].copy_from_slice(&v.to_be_bytes());
        Self(a)
    }

    pub fn from_u128(v: u128) -> Self {
        let mut a = [0u8; 32];
        a[16..].copy_from_slice(&v.to_be_bytes());
        Self(a)
    }

    pub fn bitor(self, other: Self) -> Self {
        let mut a = [0u8; 32];
        for i in 0..32 {
            a[i] = self.0[i] | other.0[i];
        }
        Self(a)
    }

    /// Shift left by `bits`, dropping bits that fall off the top (mod 2^256).
    pub fn shl(self, bits: u32) -> Self {
        if bits == 0 {
            return self;
        }
        if bits >= 256 {
            return Self::ZERO;
        }
        let byte_shift = (bits / 8) as usize;
        let rem = (bits % 8) as u8;
        let mut shifted = [0u8; 32];
        shifted[..32 - byte_shift].copy_from_slice(&self.0[byte_shift..]);
        if rem == 0 {
            return Self(shifted);
        }
        let mut out = [0u8; 32];
        let mut carry = 0u8;
        for i in (0..32).rev() {
            let cur = shifted[i];
            out[i] = (cur << rem) | carry;
            carry = cur >> (8 - rem);
        }
        Self(out)
    }

    /// Keep the least-significant `bits` and zero the rest.
    pub fn mask_low(self, bits: u32) -> Self {
        if bits == 0 {
            return Self::ZERO;
        }
        if bits >= 256 {
            return self;
        }
        let full = (bits / 8) as usize;
        let rem = (bits % 8) as u8;
        let mut out = self.0;
        let boundary = if rem == 0 { 32 - full } else { 32 - full - 1 };
        for i in 0..boundary {
            out[i] = 0;
        }
        if rem != 0 {
            out[boundary] &= (1u8 << rem) - 1;
        }
        Self(out)
    }

    pub fn parse_dec(s: &str) -> Result<Self, ()> {
        if s.is_empty() || !s.bytes().all(|b| b.is_ascii_digit()) {
            return Err(());
        }
        let mut acc = Self::ZERO;
        for b in s.bytes() {
            acc = acc.mul_small(10)?.add_small(b - b'0')?;
        }
        Ok(acc)
    }

    pub fn to_dec(self) -> String {
        if self == Self::ZERO {
            return "0".to_string();
        }
        let mut limbs = self.0;
        let mut digits = Vec::new();
        loop {
            if limbs.iter().all(|b| *b == 0) {
                break;
            }
            let mut rem = 0u16;
            for b in limbs.iter_mut() {
                let cur = (rem << 8) | u16::from(*b);
                *b = (cur / 10) as u8;
                rem = cur % 10;
            }
            digits.push(b'0' + rem as u8);
        }
        digits.reverse();
        String::from_utf8(digits).expect("decimal digits")
    }

    pub fn to_hex(self) -> String {
        format!("0x{}", hex::encode(self.0))
    }

    fn mul_small(self, m: u8) -> Result<Self, ()> {
        let mut acc = 0u16;
        let mut out = [0u8; 32];
        for i in (0..32).rev() {
            acc += u16::from(self.0[i]) * u16::from(m);
            out[i] = acc as u8;
            acc >>= 8;
        }
        if acc != 0 {
            return Err(());
        }
        Ok(Self(out))
    }

    fn add_small(self, d: u8) -> Result<Self, ()> {
        let mut out = self.0;
        let mut carry = u16::from(d);
        for i in (0..32).rev() {
            carry += u16::from(out[i]);
            out[i] = carry as u8;
            carry >>= 8;
            if carry == 0 {
                break;
            }
        }
        if carry != 0 {
            return Err(());
        }
        Ok(Self(out))
    }
}

impl PartialOrd for U256 {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

impl Ord for U256 {
    fn cmp(&self, other: &Self) -> Ordering {
        self.0.cmp(&other.0)
    }
}

impl fmt::Debug for U256 {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "U256({})", self.to_hex())
    }
}

impl fmt::Display for U256 {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.to_dec())
    }
}

pub fn parse_b256(s: &str) -> Result<[u8; 32], ()> {
    let s = s.strip_prefix("0x").or_else(|| s.strip_prefix("0X")).unwrap_or(s);
    if s.len() != 64 {
        return Err(());
    }
    let bytes = hex::decode(s).map_err(|_| ())?;
    let mut out = [0u8; 32];
    out.copy_from_slice(&bytes);
    Ok(out)
}

pub fn parse_address(s: &str) -> Result<[u8; 20], ()> {
    let s = s.strip_prefix("0x").or_else(|| s.strip_prefix("0X")).unwrap_or(s);
    if s.len() != 40 {
        return Err(());
    }
    let bytes = hex::decode(s).map_err(|_| ())?;
    let mut out = [0u8; 20];
    out.copy_from_slice(&bytes);
    Ok(out)
}
