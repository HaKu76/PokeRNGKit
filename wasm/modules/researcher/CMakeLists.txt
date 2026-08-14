if(CMAKE_SOURCE_DIR STREQUAL CMAKE_CURRENT_SOURCE_DIR)
    cmake_minimum_required(VERSION 3.31)
    project(PokeRNGKitResearcherNative LANGUAGES CXX)
    set(CMAKE_CXX_STANDARD 23)
    set(CMAKE_CXX_STANDARD_REQUIRED ON)
    set(CMAKE_CXX_EXTENSIONS OFF)
    include(CTest)
endif()

set(RESEARCHER_ROOT "${CMAKE_CURRENT_LIST_DIR}/../../..")
set(RESEARCHER_SOURCES
    bridge/researcher_bridge.cpp
    upstream/Core/RNG/MT.cpp
    upstream/Core/RNG/SFMT.cpp
    upstream/Core/RNG/TinyMT.cpp
    upstream/Core/RNG/Xorshift.cpp
    upstream/Core/RNG/Xoroshiro.cpp
)

if(EMSCRIPTEN)
    add_executable(researcher ${RESEARCHER_SOURCES})
    target_include_directories(researcher PRIVATE
        bridge
        upstream
        "${RESEARCHER_ROOT}/third_party/pokefinder"
    )
    target_compile_options(researcher PRIVATE "-O3")
    target_link_options(
        researcher
        PRIVATE
        "-O3"
        "-sMODULARIZE=1"
        "-sEXPORT_ES6=1"
        "-sEXPORT_NAME=createResearcherModule"
        "-sENVIRONMENT=worker"
        "-sALLOW_MEMORY_GROWTH=1"
        "-sFILESYSTEM=0"
        "-sASSERTIONS=0"
        "-sNO_EXIT_RUNTIME=1"
        "-sMALLOC=emmalloc"
        "-sEXPORTED_FUNCTIONS=['_malloc','_free','_researcher_api_version','_researcher_begin','_researcher_generate','_researcher_result_ptr','_researcher_result_count','_researcher_last_error']"
        "-sEXPORTED_RUNTIME_METHODS=['HEAPU32']"
    )
    set_target_properties(
        researcher
        PROPERTIES
        OUTPUT_NAME "researcher"
        SUFFIX ".mjs"
        RUNTIME_OUTPUT_DIRECTORY "${POKERNGKIT_WASM_OUTPUT_DIR}"
    )
elseif(BUILD_TESTING)
    add_executable(researcher_native_test ${RESEARCHER_SOURCES} tests/researcher_native_test.cpp)
    target_include_directories(researcher_native_test PRIVATE
        bridge
        upstream
        "${RESEARCHER_ROOT}/third_party/pokefinder"
    )
    add_test(NAME researcher_native_parity COMMAND researcher_native_test)
endif()
