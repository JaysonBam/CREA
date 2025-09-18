import { mount } from '@vue/test-utils'
import MapPicker from '../MapPicker.vue'


// Mock geolocation
const mockGeolocation = {
  getCurrentPosition: vi.fn(),
}
global.navigator.geolocation = mockGeolocation

describe('MapPicker.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state initially', () => {
    const wrapper = mount(MapPicker)
    expect(wrapper.text()).toContain('Loading map')
  })

  it('shows error if geolocation not available', async () => {
    const originalGeolocation = global.navigator.geolocation
    delete global.navigator.geolocation
    const wrapper = mount(MapPicker)
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Location not found')
    global.navigator.geolocation = originalGeolocation
  })


  it('shows error if geolocation fails', async () => {
    mockGeolocation.getCurrentPosition.mockImplementationOnce((_, error) => {
      error()
    })
    const wrapper = mount(MapPicker)
    // Wait for onMounted
    await new Promise(r => setTimeout(r, 10))
    expect(wrapper.text()).toContain('Location not found')
  })
})
