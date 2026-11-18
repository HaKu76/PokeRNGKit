// SPDX-License-Identifier: GPL-3.0-or-later
using System.Runtime.InteropServices.JavaScript;
using System.Security.Cryptography;
using PKHeX.Core;

namespace PokeRNGKit.SaveInfo;

internal static partial class BrowserCryptography
{
    [JSImport("aes", "save-info-crypto")]
    internal static partial byte[] Aes(byte[] key, byte[] iv, byte[] data, bool cbc, bool decrypt);

    [JSImport("md5", "save-info-crypto")]
    internal static partial byte[] Md5(byte[] data);
}

internal sealed class BrowserMd5Provider : IMd5Provider
{
    public void HashData(ReadOnlySpan<byte> source, Span<byte> destination) =>
        BrowserCryptography.Md5(source.ToArray()).AsSpan().CopyTo(destination);
}

internal sealed class BrowserAesProvider : IAesCryptographyProvider
{
    public IAesCryptographyProvider.IAes Create(byte[] key, CipherMode mode, PaddingMode padding, byte[]? iv = null)
    {
        if (mode is not (CipherMode.ECB or CipherMode.CBC) || padding != PaddingMode.None)
            throw new NotSupportedException("Only unpadded ECB/CBC are used by the save formats.");
        return new Session(key.ToArray(), iv?.ToArray() ?? new byte[16]);
    }

    private sealed class Session(byte[] key, byte[] iv) : IAesCryptographyProvider.IAes
    {
        private bool disposed;
        private void Transform(ReadOnlySpan<byte> input, Span<byte> output, bool cbc, bool decrypt)
        {
            ObjectDisposedException.ThrowIf(disposed, this);
            BrowserCryptography.Aes(key, iv, input.ToArray(), cbc, decrypt).AsSpan().CopyTo(output);
        }
        public void EncryptEcb(ReadOnlySpan<byte> input, Span<byte> output) => Transform(input, output, false, false);
        public void DecryptEcb(ReadOnlySpan<byte> input, Span<byte> output) => Transform(input, output, false, true);
        public void EncryptCbc(ReadOnlySpan<byte> input, Span<byte> output) => Transform(input, output, true, false);
        public void DecryptCbc(ReadOnlySpan<byte> input, Span<byte> output) => Transform(input, output, true, true);
        public void Dispose()
        {
            Array.Clear(key);
            Array.Clear(iv);
            disposed = true;
        }
    }
}
