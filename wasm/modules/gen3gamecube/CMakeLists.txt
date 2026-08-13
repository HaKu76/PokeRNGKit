set(GEN3GAMECUBE_SOURCES
    bridge/gen3gamecube_bridge.cpp
    "${POKEFINDER_ROOT}/Core/Gen3/Generators/GameCubeGenerator.cpp"
    "${POKEFINDER_ROOT}/Core/Gen3/Searchers/GameCubeSearcher.cpp"
    "${POKEFINDER_ROOT}/Core/Gen3/ShadowLock.cpp"
    "${POKEFINDER_ROOT}/Core/Parents/States/State.cpp"
    "${POKEFINDER_ROOT}/Core/RNG/LCRNGReverse.cpp"
    "${POKEFINDER_ROOT}/Core/Util/Nature.cpp"
)

if(EMSCRIPTEN)
    add_executable(gen3gamecube ${GEN3GAMECUBE_SOURCES})
    target_include_directories(gen3gamecube PRIVATE compat bridge "${POKEFINDER_ROOT}")
    target_compile_options(gen3gamecube PRIVATE "-O3")
    target_link_options(
        gen3gamecube
        PRIVATE
        "-O3"
        "-sMODULARIZE=1"
        "-sEXPORT_ES6=1"
        "-sEXPORT_NAME=createGen3GameCubeModule"
        "-sENVIRONMENT=worker"
        "-sALLOW_MEMORY_GROWTH=1"
        "-sFILESYSTEM=0"
        "-sASSERTIONS=0"
        "-sNO_EXIT_RUNTIME=1"
        "-sMALLOC=emmalloc"
        "-sEXPORTED_FUNCTIONS=['_malloc','_free','_gen3gamecube_api_version','_gen3gamecube_generate','_gen3gamecube_search','_gen3gamecube_result_ptr','_gen3gamecube_result_count','_gen3gamecube_last_error']"
        "-sEXPORTED_RUNTIME_METHODS=['HEAPU32']"
    )
    set_target_properties(
        gen3gamecube
        PROPERTIES
        OUTPUT_NAME "gen3gamecube"
        SUFFIX ".mjs"
        RUNTIME_OUTPUT_DIRECTORY "${POKERNGKIT_WASM_OUTPUT_DIR}"
    )
elseif(BUILD_TESTING)
    add_executable(gen3gamecube_native_test ${GEN3GAMECUBE_SOURCES} tests/gamecube_native_test.cpp)
    target_include_directories(gen3gamecube_native_test PRIVATE compat bridge "${POKEFINDER_ROOT}")
    add_test(NAME gen3gamecube_native_parity COMMAND gen3gamecube_native_test)
endif()
