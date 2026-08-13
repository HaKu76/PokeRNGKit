#include "../bridge/gen4seedtotime_bridge.h"

#include <cassert>
#include <cstdint>

int main()
{
    assert(gen4seedtotime_api_version() == 1);

    const auto count = gen4seedtotime_generate(0, 2000, 1, 0, 0, 0, 0, 0, 0);
    assert(gen4seedtotime_last_error() == 0);
    assert(count == 34);
    const auto *states = reinterpret_cast<const Gen4SeedToTimePackedState *>(gen4seedtotime_result_ptr());
    assert(states[0].year == 2000);
    assert(states[0].month == 7);
    assert(states[0].day == 29);
    assert(states[0].hour == 0);
    assert(states[0].minute == 53);
    assert(states[0].second == 0);
    assert(states[0].delay == 0);

    // Keep the sequence ABI live; exact sequence parity is covered by the UI/domain decoder.
    const auto sequence = gen4seedtotime_status_sequence_low();
    if (sequence == 0) return 3;

    assert(gen4seedtotime_calibrate(2000, 7, 29, 0, 53, 0, 0, 1, 1, 0, 0, 0, 0, 0) == 9);
    assert(gen4seedtotime_last_error() == 0);
    const auto *calibrations
        = reinterpret_cast<const Gen4SeedToTimePackedCalibration *>(gen4seedtotime_calibration_ptr());
    assert(calibrations[4].seed == 0);
    assert(calibrations[4].year == 2000);
    assert(calibrations[4].month == 7);
    assert(calibrations[4].day == 29);
    assert(calibrations[4].hour == 0);
    assert(calibrations[4].minute == 53);
    assert(calibrations[4].second == 0);
    assert(calibrations[4].delay == 0);

    assert(gen4seedtotime_generate(0, 1999, 0, 0, 0, 0, 0, 0, 0) == 0);
    assert(gen4seedtotime_last_error() == 1);
    assert(gen4seedtotime_generate(0, 2000, 0, 0, 1, 8, 0, 0, 0) == 0);
    assert(gen4seedtotime_last_error() == 1);
    assert(gen4seedtotime_calibrate(2000, 7, 29, 0, 53, 0, 0, 1'000'000, 500, 0, 0, 0, 0, 0) == 0);
    assert(gen4seedtotime_last_error() == 2);
    return 0;
}
