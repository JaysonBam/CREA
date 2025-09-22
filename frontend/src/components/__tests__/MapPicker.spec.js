import { mount } from '@vue/test-utils'
import MapPicker from '../MapPicker.vue'

// Mock geolocation
const mockGeolocation = {
  getCurrentPosition: vi.fn(),
}
global.navigator.geolocation = mockGeolocation

describe('MapPicker.vue', () => {
  // Reset
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Test 1: Should show loading state when component is first rendered
  it('renders loading state initially', () => {
    const wrapper = mount(MapPicker)
    expect(wrapper.text()).toContain('Loading map')
  })

  // Test 2: Should show error if geolocation is not available in the browser
  it('shows error if geolocation not available', async () => {
    const originalGeolocation = global.navigator.geolocation // Save current geolocation
    delete global.navigator.geolocation // Remove geolocation to simulate unavailability
    const wrapper = mount(MapPicker)
    await wrapper.vm.$nextTick() // Wait for DOM update
    expect(wrapper.text()).toContain('Location not found')
    global.navigator.geolocation = originalGeolocation // Restore geolocation
  })

  // Test 3: Should show error if geolocation API call fails
  it('shows error if geolocation fails', async () => {
    // Simulate geolocation failure by calling error callback
    mockGeolocation.getCurrentPosition.mockImplementationOnce((_, error) => {
      error()
    })
    const wrapper = mount(MapPicker)
    // Wait for onMounted lifecycle and async error handling
    await new Promise(r => setTimeout(r, 10))
    expect(wrapper.text()).toContain('Location not found')
  })
})
