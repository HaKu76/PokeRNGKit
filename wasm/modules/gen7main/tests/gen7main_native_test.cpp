#include "../bridge/gen7main_bridge.h"

#include <array>
#include <cassert>
#include <cstdint>

int main()
{
    assert(gen7main_api_version() == 1);

    constexpr std::array<std::uint32_t, 10> smNeedles = { 6, 10, 9, 15, 10, 0, 2, 7, 5, 8 };
    const auto smCount = gen7main_search_seed(0xbd1646d0U, 64, 417, smNeedles.data(), smNeedles.size(), 0);
    assert(smCount == 1);
    assert(gen7main_seed_result_ptr()[0].seed == 0xbd1646f7U);
    assert(gen7main_seed_result_ptr()[0].correction == 0);

    constexpr std::array<std::uint32_t, 8> usumNeedles = { 9, 10, 7, 11, 12, 15, 7, 7 };
    const auto usumCount = gen7main_search_seed(0xc31a2ee0U, 64, 477, usumNeedles.data(), usumNeedles.size(), 0);
    assert(usumCount == 1);
    assert(gen7main_seed_result_ptr()[0].seed == 0xc31a2f06U);

    constexpr std::array<std::uint32_t, 9> idNeedles = { 2, 14, 5, 6, 10, 15, 7, 6, 6 };
    const auto idCount = gen7main_search_seed(0xf9337700U, 64, 1012, idNeedles.data(), idNeedles.size(), 1);
    assert(idCount == 1);
    assert(gen7main_seed_result_ptr()[0].seed == 0xf9337724U);
    assert(gen7main_seed_result_ptr()[0].correction == 15);

    const auto qrCount = gen7main_qr_search(0xbd1646f7U, 417, 417, smNeedles.data(), smNeedles.size());
    assert(qrCount == 1);
    assert(gen7main_qr_result_ptr()[0].lastClockFrame == 426);
    assert(gen7main_qr_result_ptr()[0].afterQrFrame == 428);

    assert(gen7main_calculate_time(0xbd1646f7U, 425, 425, 0, 0, 0) == 1);
    assert(gen7main_time_primary() == 0);
    assert(gen7main_time_secondary() == 0);
    assert(gen7main_calculate_time(0xbd1646f7U, 425, 420, 0, 0, 0) == 1);
    const auto reversePrimary = gen7main_time_primary();
    assert(gen7main_calculate_time(0xbd1646f7U, 420, 425, 0, 0, 0) == 1);
    assert(reversePrimary == -gen7main_time_primary());

    return 0;
}
